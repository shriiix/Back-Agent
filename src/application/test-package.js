require("dotenv").config();

const {
    initDatabase,
    getJobs,
    closeDatabase
} = require("../db/database");

const {
    buildApplicationPackage,
    saveApplicationPackage
} = require("./application-package");


async function main() {

    console.log("=================================");
    console.log("🧪 PHASE 5A — APPLICATION PACKAGE TEST");
    console.log("=================================\n");

    try {

        // ==============================================
        // 1. Initialize database
        // ==============================================

        await initDatabase();


        // ==============================================
        // 2. Load jobs
        // ==============================================

        console.log("📚 Loading jobs from database...");

        const jobs = await getJobs(1000);

        console.log(
            `📚 Loaded ${jobs.length} jobs`
        );


        // ==============================================
        // 3. Find an AI-analyzed GOOD/STRONG match
        // ==============================================

        const job = jobs.find(item => {

            const analyzed =
                item.ai_analyzed_at !== null &&
                item.ai_analyzed_at !== undefined &&
                item.ai_analyzed_at !== "";

            const goodRecommendation =
                item.ai_recommendation === "GOOD_MATCH";

            const strongRecommendation =
                item.ai_recommendation === "STRONG_MATCH";

            return (
                analyzed &&
                (
                    goodRecommendation ||
                    strongRecommendation
                )
            );
        });


        // ==============================================
        // 4. No suitable job
        // ==============================================

        if (!job) {

            console.log("");
            console.log("❌ No GOOD_MATCH or STRONG_MATCH job found.");
            console.log("");
            console.log(
                "Phase 5A only prepares applications for jobs"
            );
            console.log(
                "that successfully passed Phase 4 AI matching."
            );
            console.log("");
            console.log(
                "Run Phase 4 first and create at least one"
            );
            console.log(
                "GOOD_MATCH or STRONG_MATCH result."
            );

            return;
        }


        // ==============================================
        // 5. Display selected job
        // ==============================================

        console.log("");
        console.log("🎯 SELECTED PHASE 4 JOB");
        console.log("=================================");

        console.log(
            `Title: ${job.title}`
        );

        console.log(
            `Company: ${job.company}`
        );

        console.log(
            `Location: ${job.location || "N/A"}`
        );

        console.log(
            `Database ID: ${job.id}`
        );

        console.log(
            `Source ID: ${job.source_id}`
        );

        console.log(
            `AI Score: ${job.match_score ?? "N/A"}`
        );

        console.log(
            `Recommendation: ${job.ai_recommendation}`
        );

        console.log(
            `Career Track: ${job.career_track || "N/A"}`
        );

        console.log(
            `AI Analyzed At: ${job.ai_analyzed_at}`
        );


        // ==============================================
        // 6. Parse Phase 4 AI fields
        // ==============================================

        function parseJsonArray(value) {

            if (!value) {
                return [];
            }

            if (Array.isArray(value)) {
                return value;
            }

            try {

                const parsed =
                    JSON.parse(value);

                return Array.isArray(parsed)
                    ? parsed
                    : [];

            } catch {

                return [];
            }
        }


        const aiMatch = {

            score:
                job.match_score ?? null,

            recommendation:
                job.ai_recommendation || null,

            careerTrack:
                job.career_track || null,

            roleMatch:
                job.role_match ?? null,

            skillsMatch:
                job.skills_match ?? null,

            experienceMatch:
                job.experience_match ?? null,

            educationMatch:
                job.education_match ?? null,

            locationMatch:
                job.location_match ?? null,

            matchedSkills:
                parseJsonArray(
                    job.matched_skills
                ),

            missingRequiredSkills:
                parseJsonArray(
                    job.missing_required_skills
                ),

            missingPreferredSkills:
                parseJsonArray(
                    job.missing_preferred_skills
                ),

            strengths:
                parseJsonArray(
                    job.ai_strengths
                ),

            concerns:
                parseJsonArray(
                    job.ai_concerns
                ),

            reason:
                job.ai_reason || "",

            experienceAssessment:
                job.ai_experience_assessment || "",

            locationAssessment:
                job.ai_location_assessment || "",

            workAuthorizationConcern:
                job.ai_work_authorization_concern || ""
        };


        // ==============================================
        // 7. Verify resume
        // ==============================================

        console.log("");
        console.log("📄 Checking resume...");


        // ==============================================
        // 8. Build application package
        // ==============================================

        const applicationPackage =
            buildApplicationPackage(
                job,
                aiMatch
            );


        // ==============================================
        // 9. Save package
        // ==============================================

        const filePath =
            saveApplicationPackage(
                applicationPackage
            );


        // ==============================================
        // 10. Display package
        // ==============================================

        console.log("");
        console.log("=================================");
        console.log("📦 APPLICATION PACKAGE");
        console.log("=================================");

        console.log(
            `Company: ${
                applicationPackage.job.company
            }`
        );

        console.log(
            `Role: ${
                applicationPackage.job.title
            }`
        );

        console.log(
            `Location: ${
                applicationPackage.job.location ||
                "N/A"
            }`
        );

        console.log(
            `Match Score: ${
                applicationPackage.match.score
            }`
        );

        console.log(
            `Recommendation: ${
                applicationPackage.match.recommendation
            }`
        );

        console.log(
            `Career Track: ${
                applicationPackage.match.careerTrack
            }`
        );

        console.log(
            `Resume: ${
                applicationPackage.resume.filename
            }`
        );

        console.log(
            `Resume Size: ${
                applicationPackage.resume.size
            } bytes`
        );

        console.log(
            `Submission Allowed: ${
                applicationPackage.submissionAllowed
            }`
        );

        console.log(
            `Approval Required: ${
                applicationPackage.approval.required
            }`
        );

        console.log(
            `Saved: ${filePath}`
        );


        // ==============================================
        // 11. Safety check
        // ==============================================

        console.log("");
        console.log("🛡️ SAFETY CHECK");

        console.log(
            "No application was submitted."
        );

        console.log(
            "No browser automation was triggered."
        );

        console.log(
            "Phase 5A only prepared the application package."
        );

        console.log("");
        console.log("=================================");
        console.log("✅ PHASE 5A TEST COMPLETE");
        console.log("=================================");

    } finally {

        await closeDatabase();
    }
}


main().catch(error => {

    console.error("");
    console.error("❌ PHASE 5A FAILED");
    console.error(error.message);

    process.exit(1);
});