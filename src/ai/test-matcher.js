require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    initDatabase,
    getJobs,
    closeDatabase
} = require("../db/database");

const {
    filterJobs
} = require("../services/job-filter");

const {
    matchJob
} = require("./job-matcher");


// ==================================================
// Load candidate profile
// ==================================================

function loadCandidate() {

    const candidatePath =
        path.join(
            __dirname,
            "../../data/candidate.json"
        );

    if (!fs.existsSync(candidatePath)) {
        throw new Error(
            `Candidate profile not found: ${candidatePath}`
        );
    }

    return JSON.parse(
        fs.readFileSync(
            candidatePath,
            "utf8"
        )
    );
}


// ==================================================
// Main
// ==================================================

async function main() {

    console.log("=================================");
    console.log("🧪 PHASE 3 → PHASE 4 TEST");
    console.log("=================================\n");


    // ==================================================
    // 1. Load candidate
    // ==================================================

    const candidate =
        loadCandidate();

    console.log(
        "✅ Candidate profile loaded"
    );

    console.log(
        `   Name: ${candidate.name || "N/A"}`
    );

    console.log(
        `   Location: ${
            candidate.location?.city || "N/A"
        }, ${
            candidate.location?.country || "N/A"
        }`
    );

    console.log(
        `   Target roles: ${
            candidate.targetRoles?.length || 0
        }`
    );


    // ==================================================
    // 2. Initialize database
    // ==================================================

    console.log(
        "\n🗄️ Initializing database..."
    );

    await initDatabase();


    // ==================================================
    // 3. Load jobs
    // ==================================================

    const jobs =
        await getJobs(1000);

    console.log(
        `📚 Loaded ${jobs.length} jobs`
    );


    if (!jobs.length) {
        throw new Error(
            "No jobs found in database."
        );
    }


    // ==================================================
    // 4. Run EXACT Phase 3 filter
    // ==================================================

    console.log(
        "\n🔎 Running Phase 3 candidate filter..."
    );

    const filtered =
        filterJobs(jobs);


    console.log(
        `✅ Phase 3 produced ${
            filtered.candidates.length
        } AI candidates`
    );


    if (
        filtered.candidates.length === 0
    ) {

        throw new Error(
            "Phase 3 returned zero AI candidates."
        );
    }


    // ==================================================
    // 5. Show candidate queue
    // ==================================================

    console.log(
        "\n🤖 PHASE 3 CANDIDATE QUEUE"
    );

    console.log(
        "=================================\n"
    );


    filtered.candidates
        .slice(0, 10)
        .forEach(
            (result, index) => {

                const job =
                    result.job;

                console.log(
                    `${index + 1}. ${job.title}`
                );

                console.log(
                    `   Company: ${job.company}`
                );

                console.log(
                    `   Location: ${
                        job.location || "N/A"
                    }`
                );

                console.log(
                    `   Track: ${
                        result.careerTrack
                    }`
                );

                console.log(
                    `   Seniority: ${
                        result.seniority
                    }`
                );

                console.log(
                    `   URL: ${job.url}`
                );

                console.log("");
            }
        );


    // ==================================================
    // 6. Select FIRST actual Phase 3 candidate
    // ==================================================

    const selected =
        filtered.candidates[0];

    const job =
        selected.job;


    console.log(
        "================================="
    );

    console.log(
        "🎯 SELECTED JOB FOR AI TEST"
    );

    console.log(
        "=================================\n"
    );

    console.log(
        `Title: ${job.title}`
    );

    console.log(
        `Company: ${job.company}`
    );

    console.log(
        `Location: ${
            job.location || "N/A"
        }`
    );

    console.log(
        `Track: ${
            selected.careerTrack
        }`
    );

    console.log(
        `Seniority: ${
            selected.seniority
        }`
    );

    console.log(
        `Description length: ${
            job.description?.length || 0
        } characters`
    );

    console.log(
        `URL: ${job.url}`
    );


    // ==================================================
    // 7. Validate description
    // ==================================================

    if (
        !job.description ||
        job.description.length < 100
    ) {

        throw new Error(
            "Selected job does not contain a usable job description."
        );
    }


    // ==================================================
    // 8. Send EXACT Phase 3 candidate to Gemini
    // ==================================================

    console.log(
        "\n================================="
    );

    console.log(
        "🤖 SENDING TO GEMINI"
    );

    console.log(
        "=================================\n"
    );


    const result =
        await matchJob(
            candidate,
            job
        );


    // ==================================================
    // 9. Display result
    // ==================================================

    console.log(
        "\n================================="
    );

    console.log(
        "🎯 GEMINI MATCH RESULT"
    );

    console.log(
        "=================================\n"
    );


    console.log(
        JSON.stringify(
            result,
            null,
            2
        )
    );


    // ==================================================
    // 10. Human-readable summary
    // ==================================================

    console.log(
        "\n================================="
    );

    console.log(
        "📊 MATCH SUMMARY"
    );

    console.log(
        "================================="
    );

    console.log(
        `Overall Score:       ${result.score}/100`
    );

    console.log(
        `Recommendation:      ${result.recommendation}`
    );

    console.log(
        `Career Track:        ${result.careerTrack}`
    );

    console.log(
        `Role Match:          ${result.roleMatch}/100`
    );

    console.log(
        `Skills Match:        ${result.skillsMatch}/100`
    );

    console.log(
        `Experience Match:    ${result.experienceMatch}/100`
    );

    console.log(
        `Education Match:     ${result.educationMatch}/100`
    );

    console.log(
        `Location Match:      ${result.locationMatch}/100`
    );


    console.log(
        "\nMatched Skills:"
    );

    result.matchedSkills
        .forEach(
            skill =>
                console.log(
                    `   ✅ ${skill}`
                )
        );


    console.log(
        "\nMissing Required Skills:"
    );

    if (
        result.missingRequiredSkills.length === 0
    ) {

        console.log(
            "   None"
        );

    } else {

        result.missingRequiredSkills
            .forEach(
                skill =>
                    console.log(
                        `   ❌ ${skill}`
                    )
            );
    }


    console.log(
        "\nConcerns:"
    );

    if (
        result.concerns.length === 0
    ) {

        console.log(
            "   None"
        );

    } else {

        result.concerns
            .forEach(
                concern =>
                    console.log(
                        `   ⚠️ ${concern}`
                    )
            );
    }


    console.log(
        "\nReason:"
    );

    console.log(
        `   ${result.reason}`
    );


    // ==================================================
    // 11. Safety message
    // ==================================================

    console.log(
        "\n================================="
    );

    console.log(
        "🛡️ SAFETY CHECK"
    );

    console.log(
        "================================="
    );

    console.log(
        "No application was submitted."
    );

    console.log(
        "No browser automation was triggered."
    );

    console.log(
        "This test only analyzed the job."
    );


    // ==================================================
    // 12. Close DB
    // ==================================================

    await closeDatabase();


    console.log(
        "\n================================="
    );

    console.log(
        "✅ PHASE 3 → PHASE 4 TEST COMPLETE"
    );

    console.log(
        "================================="
    );
}


// ==================================================
// Error handling
// ==================================================

main().catch(
    async error => {

        console.error(
            "\n================================="
        );

        console.error(
            "❌ TEST FAILED"
        );

        console.error(
            "================================="
        );

        console.error(
            error.message
        );

        if (error.stack) {

            console.error(
                "\nStack:"
            );

            console.error(
                error.stack
            );
        }

        try {
            await closeDatabase();
        } catch {}

        process.exit(1);
    }
);