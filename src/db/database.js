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

async function initDatabase() {
    console.log(`📁 Database: ${DB_PATH}`);

    db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    console.log("✅ SQLite database opened");

    const schema = fs.readFileSync(SCHEMA_PATH, "utf8");

    await db.exec(schema);

    console.log("✅ Database schema initialized");

    return db;
}

async function saveJob(job) {
    const existing = await db.get(
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)

        ON CONFLICT(id) DO UPDATE SET
            company = excluded.company,
            title = excluded.title,
            location = excluded.location,
            remote = excluded.remote,
            salary = excluded.salary,
            description = excluded.description,
            url = excluded.url,
            application_url = excluded.application_url,
            posted_at = excluded.posted_at,
            updated_at = excluded.updated_at,
            departments = excluded.departments,
            offices = excluded.offices,
            last_seen_at = CURRENT_TIMESTAMP
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
            JSON.stringify(job.departments || []),
            JSON.stringify(job.offices || [])
        ]
    );

    return !existing;
}

async function saveJobs(jobs) {
    let newJobs = 0;
    let existingJobs = 0;

    await db.run("BEGIN TRANSACTION");

    try {
        for (const job of jobs) {
            const isNew = await saveJob(job);

            if (isNew) {
                newJobs++;
            } else {
                existingJobs++;
            }
        }

        await db.run("COMMIT");
    } catch (error) {
        await db.run("ROLLBACK");
        throw error;
    }

    return {
        total: jobs.length,
        newJobs,
        existingJobs
    };
}

async function getJobs(limit = 50) {
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

async function getJob(id) {
    return db.get(
        `SELECT * FROM jobs WHERE id = ?`,
        id
    );
}

async function closeDatabase() {
    if (db) {
        await db.close();
        db = null;
    }
}

module.exports = {
    initDatabase,
    saveJob,
    saveJobs,
    getJob,
    getJobs,
    closeDatabase
};