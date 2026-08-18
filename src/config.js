module.exports = {
    jobPreferences: {

        // ------------------------------------------
        // Target job titles / keywords
        // ------------------------------------------

        targetRoles: [
            "software engineer",
            "software developer",

            "full stack developer",
            "full stack engineer",

            "frontend developer",
            "frontend engineer",

            "react developer",
            "react engineer",

            "ai engineer",

            "qa engineer",
            "quality assurance engineer",
            "sdet",
            "automation test engineer",
            "test automation engineer"
        ],

        // ------------------------------------------
        // Titles we DON'T want
        // ------------------------------------------

        excludedTitles: [
            "senior",
            "sr.",
            "sr ",
            "staff",
            "principal",
            "lead",
            "manager",
            "director",
            "head of",
            "vp",
            "vice president",

            "intern",
            "internship",

            "data engineer",
            "data scientist",
            "data analyst",

            "devops engineer",
            "site reliability engineer",

            "sales",
            "account executive",
            "account manager",
            "marketing",
            "recruiter",
            "human resources",
            "customer success"
        ],

        // ------------------------------------------
        // Preferred locations
        // ------------------------------------------

        preferredLocations: [
            "india",
            "pune",
            "mumbai",
            "bangalore",
            "bengaluru",
            "hyderabad",
            "remote"
        ],

        // ------------------------------------------
        // Minimum match score
        // ------------------------------------------

        minMatchScore: 70
    }
};