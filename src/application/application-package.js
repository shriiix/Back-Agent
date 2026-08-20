const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.join(__dirname, "../..");

const CANDIDATE_PATH = path.join(
    PROJECT_ROOT,
    "data",
    "candidate.json"
);

const RESUME_PATH = path.join(
    PROJECT_ROOT,
    "data",
    "resume.pdf"
);


function loadCandidate() {

    if (!fs.existsSync(CANDIDATE_PATH)) {
        throw new Error(
            `Candidate profile not found: ${CANDIDATE_PATH}`
        );
    }

    return JSON.parse(
        fs.readFileSync(
            CANDIDATE_PATH,
            "utf8"
        )
    );
}


function verifyResume() {

    if (!fs.existsSync(RESUME_PATH)) {
        throw new Error(
            `Resume not found: ${RESUME_PATH}`
        );
    }

    const stats =
        fs.statSync(RESUME_PATH);

    if (stats.size === 0) {
        throw new Error(
            "Resume file is empty"
        );
    }

    return {
        path: RESUME_PATH,
        filename: path.basename(RESUME_PATH),
        type: "application/pdf",
        size: stats.size
    };
}


function getCandidateField(
    candidate,
    ...keys
) {

    for (const key of keys) {

        if (
            candidate[key] !== undefined &&
            candidate[key] !== null &&
            candidate[key] !== ""
        ) {
            return candidate[key];
        }
    }

    return null;
}


function buildApplicationPackage(
    job,
    aiMatch
) {

    const candidate =
        loadCandidate();

    const resume =
        verifyResume();


    return {

        generatedAt:
            new Date().toISOString(),

        status:
            "PREPARATION_ONLY",

        submissionAllowed:
            false,

        job: {

            id:
                job.id,

            source:
                job.source,

            company:
                job.company,

            title:
                job.title,

            location:
                job.location,

            url:
                job.url,

            applicationUrl:
                job.application_url ||
                job.applicationUrl ||
                job.url
        },


        match: {

            score:
                aiMatch?.score ?? null,

            recommendation:
                aiMatch?.recommendation ||
                null,

            careerTrack:
                aiMatch?.careerTrack ||
                null,

            reason:
                aiMatch?.reason ||
                "",

            strengths:
                aiMatch?.strengths || [],

            concerns:
                aiMatch?.concerns || []
        },


        candidate: {

            name:
                getCandidateField(
                    candidate,
                    "name",
                    "fullName"
                ),

            email:
                getCandidateField(
                    candidate,
                    "email"
                ),

            phone:
                getCandidateField(
                    candidate,
                    "phone",
                    "phoneNumber"
                ),

            location:
                getCandidateField(
                    candidate,
                    "location"
                ),

            linkedin:
                getCandidateField(
                    candidate,
                    "linkedin",
                    "linkedinUrl"
                ),

            github:
                getCandidateField(
                    candidate,
                    "github",
                    "githubUrl"
                )
        },


        resume: {

            path:
                resume.path,

            filename:
                resume.filename,

            type:
                resume.type,

            size:
                resume.size
        },


        applicationAnswers: {},

        approval: {

            required:
                true,

            approved:
                false,

            approvedAt:
                null
        }
    };
}


function saveApplicationPackage(
    applicationPackage,
    outputDirectory = "data/applications"
) {

    const outputPath =
        path.join(
            PROJECT_ROOT,
            outputDirectory
        );


    if (
        !fs.existsSync(outputPath)
    ) {

        fs.mkdirSync(
            outputPath,
            {
                recursive: true
            }
        );
    }


    const safeCompany =
        String(
            applicationPackage.job.company ||
            "company"
        )
            .replace(
                /[^a-z0-9]+/gi,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            )
            .toLowerCase();


    const safeTitle =
        String(
            applicationPackage.job.title ||
            "job"
        )
            .replace(
                /[^a-z0-9]+/gi,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            )
            .toLowerCase();


    const safeJobId =
        String(
            applicationPackage.job.id ||
            "unknown-job"
        )
            .replace(
                /[^a-z0-9_-]+/gi,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            );


    const filename =
        `${safeCompany}-${safeTitle}-${safeJobId}.json`;


    const filePath =
        path.join(
            outputPath,
            filename
        );


    fs.writeFileSync(
        filePath,
        JSON.stringify(
            applicationPackage,
            null,
            2
        ),
        "utf8"
    );


    return filePath;
}


module.exports = {
    loadCandidate,
    verifyResume,
    buildApplicationPackage,
    saveApplicationPackage
};