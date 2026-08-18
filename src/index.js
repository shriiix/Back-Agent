console.log("DEBUG 1: index.js started");

require("dotenv").config();

console.log("DEBUG 2: dotenv loaded");

const {
    collectGreenhouseJobs
} = require("./collectors/greenhouse");

console.log("DEBUG 3: greenhouse collector loaded");

const {
    initDatabase,
    saveJobs,
    getJobs,
    closeDatabase
} = require("./db/database");

console.log("DEBUG 4: database module loaded");

const {
    filterJobs
} = require("./services/job-filter");

console.log("DEBUG 5: job filter loaded");


async function main() {

    console.log("=================================");
    console.log("🚀 Job Application Agent");
    console.log("=================================\n");


    // ------------------------------------------
    // 1. Initialize database
    // ------------------------------------------

    console.log("🗄️ Initializing database...");

    await initDatabase();

    console.log("✅ Database ready\n");


    // ------------------------------------------
    // 2. Get board token
    // ------------------------------------------

    const boardToken = process.argv[2];

    if (!boardToken) {

        console.log("❌ Greenhouse board token missing.");
        console.log("");
        console.log("Usage:");
        console.log("  node src/index.js <board-token>");
        console.log("");
        console.log("Example:");
        console.log("  node src/index.js stripe");

        await closeDatabase();

        process.exit(1);
    }


    console.log(`🔎 Fetching jobs from: ${boardToken}\n`);


    // ------------------------------------------
    // 3. Fetch jobs
    // ------------------------------------------

    console.log("🌐 Calling Greenhouse API...");

    const jobs = await collectGreenhouseJobs(boardToken);

    console.log("✅ Greenhouse API completed");

    console.log(`📦 Found ${jobs.length} jobs\n`);


    // ------------------------------------------
    // 4. Save jobs
    // ------------------------------------------

    console.log("💾 Saving jobs to database...\n");

    const result = await saveJobs(jobs);

    console.log(`✅ ${result.total} jobs processed`);
    console.log(`🆕 ${result.newJobs} new jobs`);
    console.log(`🔁 ${result.existingJobs} already known\n`);


    // ------------------------------------------
    // 5. Get jobs from database
    // ------------------------------------------

    const storedJobs = await getJobs(1000);

    console.log(
        `📚 Loaded ${storedJobs.length} jobs from database\n`
    );


    // ------------------------------------------
    // 6. Apply job filters
    // ------------------------------------------

    console.log("🔎 Applying job filters...\n");

    const filtered = filterJobs(storedJobs);


    // ------------------------------------------
    // 7. Filter statistics
    // ------------------------------------------

    const roleMatches = filtered.all.filter(
        result =>
            result.reason !== "ROLE_MISMATCH" &&
            result.reason !== "EXCLUDED_TITLE"
    ).length;

    const locationMatches = filtered.all.filter(
        result =>
            result.reason !== "LOCATION_MISMATCH"
    ).length;


    console.log("=================================");
    console.log("📊 FILTER RESULTS");
    console.log("=================================");

    console.log(`Total jobs:       ${storedJobs.length}`);
    console.log(`Role matches:     ${roleMatches}`);
    console.log(`Location matches: ${locationMatches}`);
    console.log(`Final matches:    ${filtered.eligible.length}`);

    console.log("=================================\n");


    // ------------------------------------------
    // 8. Display relevant jobs
    // ------------------------------------------

    console.log("🎯 RELEVANT JOBS\n");

    if (filtered.eligible.length === 0) {

        console.log("No jobs matched your current preferences.");

    } else {

        filtered.eligible
            .slice(0, 50)
            .forEach((result, index) => {

                const job = result.job;

                console.log(
                    `${index + 1}. ${job.title}`
                );

                console.log(
                    `   Company: ${job.company}`
                );

                console.log(
                    `   Location: ${job.location}`
                );

                console.log(
                    `   Score: ${result.score}/100`
                );

                console.log(
                    `   Reason: ${result.reason}`
                );

                console.log(
                    `   URL: ${job.url}`
                );

                console.log("");
            });
    }


    // ------------------------------------------
    // 9. Close database
    // ------------------------------------------

    await closeDatabase();

    console.log("=================================");
    console.log("✅ Phase 3 completed");
    console.log("=================================");
}


main().catch(async error => {

    console.error("\n=================================");
    console.error("❌ AGENT FAILED");
    console.error("=================================");

    console.error("Error:", error.message);

    if (error.stack) {
        console.error("\nStack:");
        console.error(error.stack);
    }

    try {
        await closeDatabase();
    } catch (closeError) {
        console.error(
            "Database close error:",
            closeError.message
        );
    }

    process.exit(1);
});