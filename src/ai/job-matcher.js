const {
    generateMatch,
    DEFAULT_MODEL
} = require("./providers/groq");

const {
    buildUserPrompt
} = require("./prompts");


// ==================================================
// Retry configuration
// ==================================================

const MAX_ATTEMPTS = 3;

const RETRY_DELAYS = [
    2000,
    5000
];


// ==================================================
// Sleep
// ==================================================

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}


// ==================================================
// Detect retryable errors
// ==================================================

function isRetryableError(
    error
) {

    const message =
        String(
            error?.message ||
            error ||
            ""
        ).toLowerCase();


    // ------------------------------------------
    // Quota / rate limit
    // ------------------------------------------

    if (
        message.includes("429") ||
        message.includes("rate limit") ||
        message.includes("rate_limit")
    ) {

        return true;
    }


    // ------------------------------------------
    // Temporary server problems
    // ------------------------------------------

    if (
        message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("504") ||
        message.includes("timeout") ||
        message.includes("temporarily unavailable")
    ) {

        return true;
    }


    return false;
}


// ==================================================
// Match one job
// ==================================================

async function matchJob(
    candidate,
    job
) {

    console.log(
        `\n🤖 Groq analyzing: ${job.title}`
    );


    console.log(
        `   Company: ${job.company || "N/A"
        }`
    );


    console.log(
        `   Location: ${job.location || "N/A"
        }`
    );


    console.log(
        `   JD length: ${(job.description || "").length
        } characters`
    );


    console.log(
        `   Model: ${DEFAULT_MODEL}`
    );


    const systemPrompt = `
You are an expert technical recruiter and candidate-job matching engine.

Your job is to evaluate ONE candidate against ONE job posting.

You must carefully compare the candidate profile with the complete job description.

IMPORTANT RULES:

1. Use ONLY information present in the candidate profile and job description.
2. Never invent experience, skills, certifications, education, location eligibility, or work authorization.
3. Distinguish REQUIRED qualifications from PREFERRED qualifications.
4. Missing a preferred qualification should NOT heavily reduce the score.
5. A missing mandatory qualification should significantly reduce the score.
6. Consider the candidate's actual professional experience, not only internships or academic projects.
7. Consider the candidate's target career track.
8. Consider India/India-remote location preference.
9. If job location is unknown, do NOT assume it is India or remote.
10. If work authorization is unclear, explicitly mention that uncertainty.
11. Evaluate the entire job description, not just the job title.
12. Return EVERY field in the required JSON structure.
13. Never leave required fields empty when the information can reasonably be derived from the candidate/job.
14. Return ONLY valid JSON. Do not include markdown.
15. All numeric scores must be integers between 0 and 100.

SCORING:

roleMatch:
How closely the actual job role matches the candidate's target roles.

skillsMatch:
How closely the candidate's technical skills match the required and preferred skills.

experienceMatch:
How well the candidate's actual professional experience matches the experience requirements.

educationMatch:
How well the candidate's education matches the job requirements.

locationMatch:
How suitable the job location is for the candidate.
India / India Remote = high.
Remote with unclear country eligibility = moderate.
Clearly foreign non-remote = very low.
Unknown location = moderate/uncertain.

OVERALL SCORE:

Consider all dimensions, but prioritize:
1. Required qualifications
2. Experience
3. Role fit
4. Technical skills
5. Location
6. Education

RECOMMENDATION:

90-100:
STRONG_MATCH

75-89:
GOOD_MATCH

60-74:
REVIEW

40-59:
WEAK_MATCH

0-39:
SKIP

IMPORTANT:

Do not automatically mark a job as SKIP simply because the candidate has less experience than the preferred range.

However, if the job explicitly requires a minimum number of years and the candidate clearly does not meet that minimum, reduce experienceMatch substantially.

Return EXACTLY this JSON structure:

{
  "score": 0,
  "recommendation": "SKIP",
  "careerTrack": "development",
  "roleMatch": 0,
  "skillsMatch": 0,
  "experienceMatch": 0,
  "educationMatch": 0,
  "locationMatch": 0,
  "matchedSkills": [],
  "missingRequiredSkills": [],
  "missingPreferredSkills": [],
  "experienceAssessment": "",
  "locationAssessment": "",
  "workAuthorizationConcern": "",
  "strengths": [],
  "concerns": [],
  "reason": ""
}

FIELD REQUIREMENTS:

score:
Integer from 0 to 100.

recommendation:
Must be exactly one of:
STRONG_MATCH
GOOD_MATCH
REVIEW
WEAK_MATCH
SKIP

careerTrack:
Use one of:
development
qa
hybrid
unknown

roleMatch:
Integer 0-100.

skillsMatch:
Integer 0-100.

experienceMatch:
Integer 0-100.

educationMatch:
Integer 0-100.

locationMatch:
Integer 0-100.

matchedSkills:
Array of concrete skills that appear both in the candidate profile and are relevant to the job.

missingRequiredSkills:
Array containing required qualifications/skills that the candidate does not clearly have.

missingPreferredSkills:
Array containing preferred qualifications/skills that the candidate does not clearly have.

experienceAssessment:
Explain the candidate's experience versus the job's requirements.

locationAssessment:
Explain the candidate's location versus the job's location.

workAuthorizationConcern:
Explain any known or potential authorization issue. Do not invent one.

strengths:
Array of the strongest reasons the candidate could be considered.

concerns:
Array of the biggest weaknesses or risks.

reason:
A concise final explanation of why the recommendation was made.

FINAL VALIDATION BEFORE RESPONDING:

Make sure:
- score is populated
- recommendation is populated
- careerTrack is populated
- all five component scores are populated
- matchedSkills is an array
- missingRequiredSkills is an array
- missingPreferredSkills is an array
- strengths is an array
- concerns is an array
- reason is populated

Return JSON ONLY.
`;

    const userPrompt =
        buildUserPrompt(
            candidate,
            job
        );


    let lastError;


    for (
        let attempt = 1;
        attempt <= MAX_ATTEMPTS;
        attempt++
    ) {

        console.log(
            `   Groq attempt ${attempt}/${MAX_ATTEMPTS}`
        );


        try {

            const result =
                await generateMatch(
                    systemPrompt,
                    userPrompt
                );


            // ------------------------------------------
            // Validate result
            // ------------------------------------------

            const validated =
                validateMatchResult(
                    result
                );


            return validated;


        } catch (error) {

            lastError =
                error;


            console.error(
                `   ⚠️ Groq error: ${error.message
                }`
            );


            if (
                !isRetryableError(
                    error
                )
            ) {

                throw error;
            }


            if (
                attempt >= MAX_ATTEMPTS
            ) {

                break;
            }


            const delay =
                RETRY_DELAYS[
                attempt - 1
                ] ||
                5000;


            console.log(
                `   ⏳ Waiting ${delay / 1000
                } seconds before retry...`
            );


            await sleep(
                delay
            );
        }
    }


    throw new Error(
        `Groq failed after ${MAX_ATTEMPTS} attempts: ${lastError?.message ||
        "Unknown error"
        }`
    );
}


// ==================================================
// Validate AI result
// ==================================================

function validateMatchResult(
    result
) {

    if (
        !result ||
        typeof result !== "object"
    ) {

        throw new Error(
            "AI returned invalid result"
        );
    }


    const score =
        Number(
            result.score
        );


    if (
        Number.isNaN(score)
    ) {

        throw new Error(
            "AI result missing valid score"
        );
    }


    const allowedRecommendations = [

        "STRONG_MATCH",

        "GOOD_MATCH",

        "REVIEW",

        "WEAK_MATCH",

        "SKIP"
    ];


    let recommendation =
        String(
            result.recommendation ||
            ""
        ).toUpperCase();


    if (
        !allowedRecommendations.includes(
            recommendation
        )
    ) {

        recommendation =
            score >= 85
                ? "STRONG_MATCH"
                : score >= 70
                    ? "GOOD_MATCH"
                    : score >= 55
                        ? "REVIEW"
                        : score >= 40
                            ? "WEAK_MATCH"
                            : "SKIP";
    }


    return {

        score:
            Math.max(
                0,
                Math.min(
                    100,
                    score
                )
            ),

        recommendation,

        careerTrack:
            result.careerTrack ||
            "unknown",

        roleMatch:
            Number(
                result.roleMatch || 0
            ),

        skillsMatch:
            Number(
                result.skillsMatch || 0
            ),

        experienceMatch:
            Number(
                result.experienceMatch || 0
            ),

        educationMatch:
            Number(
                result.educationMatch || 0
            ),

        locationMatch:
            Number(
                result.locationMatch || 0
            ),

        matchedSkills:
            Array.isArray(
                result.matchedSkills
            )
                ? result.matchedSkills
                : [],

        missingRequiredSkills:
            Array.isArray(
                result.missingRequiredSkills
            )
                ? result.missingRequiredSkills
                : [],

        missingPreferredSkills:
            Array.isArray(
                result.missingPreferredSkills
            )
                ? result.missingPreferredSkills
                : [],

        experienceAssessment:
            result.experienceAssessment ||
            "",

        locationAssessment:
            result.locationAssessment ||
            "",

        workAuthorizationConcern:
            result.workAuthorizationConcern ||
            "",

        strengths:
            Array.isArray(
                result.strengths
            )
                ? result.strengths
                : [],

        concerns:
            Array.isArray(
                result.concerns
            )
                ? result.concerns
                : [],

        reason:
            result.reason ||
            ""
    };
}


module.exports = {
    matchJob,
    validateMatchResult
};