const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const DB_PATH = path.join(DATA_DIR, "jobs.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db;


// ==================================================
// Initialize database
// ==================================================

async function initDatabase() {

    console.log(`📁 Database: ${DB_PATH}`);

    db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    console.log("✅ SQLite database opened");


    // ------------------------------------------
    // Base schema
    // ------------------------------------------

    const schema =
        fs.readFileSync(
            SCHEMA_PATH,
            "utf8"
        );

    await db.exec(schema);

    console.log(
        "✅ Database schema initialized"
    );


    // ------------------------------------------
    // Phase 4 migration
    // ------------------------------------------

    await migratePhase4();


    return db;
}


// ==================================================
// Phase 4 migration
// ==================================================

async function migratePhase4() {

    console.log(
        "🔧 Checking Phase 4 database fields..."
    );


    const columns =
        await db.all(
            `PRAGMA table_info(jobs)`
        );


    const existingColumns =
        new Set(
            columns.map(
                column => column.name
            )
        );


    const phase4Columns = {

        ai_recommendation:
            "TEXT",

        career_track:
            "TEXT",

        role_match:
            "REAL",

        skills_match:
            "REAL",

        experience_match:
            "REAL",

        education_match:
            "REAL",

        location_match:
            "REAL",

        matched_skills:
            "TEXT",

        missing_required_skills:
            "TEXT",

        missing_preferred_skills:
            "TEXT",

        ai_strengths:
            "TEXT",

        ai_concerns:
            "TEXT",

        ai_reason:
            "TEXT",

        ai_experience_assessment:
            "TEXT",

        ai_location_assessment:
            "TEXT",

        ai_work_authorization_concern:
            "TEXT",

        ai_analyzed_at:
            "TEXT"
    };


    let added = 0;


    for (
        const [
            column,
            type
        ]
        of Object.entries(
            phase4Columns
        )
    ) {

        if (
            existingColumns.has(
                column
            )
        ) {
            continue;
        }


        await db.exec(
            `ALTER TABLE jobs ADD COLUMN ${column} ${type}`
        );


        console.log(
            `   ➕ Added column: ${column}`
        );


        added++;
    }


    // ------------------------------------------
    // Indexes
    // ------------------------------------------

    await db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_jobs_ai_recommendation
        ON jobs(ai_recommendation)
    `);


    await db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_jobs_ai_score
        ON jobs(match_score)
    `);


    await db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_jobs_career_track
        ON jobs(career_track)
    `);


    if (added === 0) {

        console.log(
            "   ✅ Phase 4 fields already exist"
        );

    } else {

        console.log(
            `   ✅ Added ${added} Phase 4 fields`
        );
    }
}


// ==================================================
// Save one job
// ==================================================

async function saveJob(job) {

    const existing =
        await db.get(
            `SELECT id FROM jobs WHERE id = ?`,
            job.id
        );


    await db.run(
        `
        INSERT INTO jobs (
            id,
            source,
            source_id,
            company,
            title,
            location,
            remote,
            salary,
            description,
            url,
            application_url,
            posted_at,
            updated_at,
            departments,
            offices,
            last_seen_at
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
        )

        ON CONFLICT(id) DO UPDATE SET

            company =
                excluded.company,

            title =
                excluded.title,

            location =
                excluded.location,

            remote =
                excluded.remote,

            salary =
                excluded.salary,

            description =
                excluded.description,

            url =
                excluded.url,

            application_url =
                excluded.application_url,

            posted_at =
                excluded.posted_at,

            updated_at =
                excluded.updated_at,

            departments =
                excluded.departments,

            offices =
                excluded.offices,

            last_seen_at =
                CURRENT_TIMESTAMP
        `,
        [
            job.id,
            job.source,
            job.sourceId,
            job.company || "",
            job.title || "",
            job.location || "",
            job.remote ? 1 : 0,
            job.salary || null,
            job.description || "",
            job.url || "",
            job.applicationUrl || "",
            job.postedAt || null,
            job.updatedAt || null,
            JSON.stringify(
                job.departments || []
            ),
            JSON.stringify(
                job.offices || []
            )
        ]
    );


    return !existing;
}


// ==================================================
// Save multiple jobs
// ==================================================

async function saveJobs(jobs) {

    let newJobs = 0;
    let existingJobs = 0;


    await db.run(
        "BEGIN TRANSACTION"
    );


    try {

        for (
            const job of jobs
        ) {

            const isNew =
                await saveJob(job);


            if (isNew) {

                newJobs++;

            } else {

                existingJobs++;
            }
        }


        await db.run(
            "COMMIT"
        );

    } catch (error) {

        await db.run(
            "ROLLBACK"
        );

        throw error;
    }


    return {

        total:
            jobs.length,

        newJobs,

        existingJobs
    };
}


// ==================================================
// Save AI match result
// ==================================================

async function saveAIMatch(
    jobId,
    result
) {

    if (!db) {

        throw new Error(
            "Database is not initialized."
        );
    }


    await db.run(
        `
        UPDATE jobs

        SET

            match_score = ?,

            ai_recommendation = ?,

            career_track = ?,

            role_match = ?,

            skills_match = ?,

            experience_match = ?,

            education_match = ?,

            location_match = ?,

            matched_skills = ?,

            missing_required_skills = ?,

            missing_preferred_skills = ?,

            ai_strengths = ?,

            ai_concerns = ?,

            ai_reason = ?,

            ai_experience_assessment = ?,

            ai_location_assessment = ?,

            ai_work_authorization_concern = ?,

            ai_analyzed_at = CURRENT_TIMESTAMP,

            status = ?

        WHERE id = ?
        `,
        [

            result.score,

            result.recommendation,

            result.careerTrack,

            result.roleMatch,

            result.skillsMatch,

            result.experienceMatch,

            result.educationMatch,

            result.locationMatch,

            JSON.stringify(
                result.matchedSkills || []
            ),

            JSON.stringify(
                result.missingRequiredSkills || []
            ),

            JSON.stringify(
                result.missingPreferredSkills || []
            ),

            JSON.stringify(
                result.strengths || []
            ),

            JSON.stringify(
                result.concerns || []
            ),

            result.reason || "",

            result.experienceAssessment || "",

            result.locationAssessment || "",

            result.workAuthorizationConcern || "",

            "AI_ANALYZED",

            jobId
        ]
    );
}


// ==================================================
// Get jobs
// ==================================================

async function getJobs(
    limit = 50
) {

    return db.all(
        `
        SELECT *
        FROM jobs
        ORDER BY discovered_at DESC
        LIMIT ?
        `,
        limit
    );
}


// ==================================================
// Get one job
// ==================================================

async function getJob(
    id
) {

    return db.get(
        `SELECT * FROM jobs WHERE id = ?`,
        id
    );
}


// ==================================================
// Get AI candidate jobs
// ==================================================

async function getAICandidateJobs() {

    return db.all(
        `
        SELECT *
        FROM jobs

        WHERE status = 'AI_CANDIDATE'

        ORDER BY
            discovered_at DESC
        `
    );
}


// ==================================================
// Get analyzed jobs
// ==================================================

async function getAnalyzedJobs() {

    return db.all(
        `
        SELECT *
        FROM jobs

        WHERE ai_analyzed_at IS NOT NULL

        ORDER BY
            match_score DESC
        `
    );
}


// ==================================================
// Close database
// ==================================================

async function closeDatabase() {

    if (db) {

        await db.close();

        db = null;
    }
}


// ==================================================
// Exports
// ==================================================

module.exports = {

    initDatabase,

    saveJob,

    saveJobs,

    saveAIMatch,

    getJob,

    getJobs,

    getAICandidateJobs,

    getAnalyzedJobs,

    closeDatabase
};