const apiUrls = [
    "https://bff.prod.silver.endowus.com/v1/goals/performance",
    "https://bff.prod.silver.endowus.com/v2/goals/investible",
    "https://bff.prod.silver.endowus.com/v1/goals"
];

let performanceData = null;
let investibleData = null;
let summaryData = null;
let mergedInvestmentData = null;

function portfolioDetailsIntercepter(details) {
    console.log("Request Intercepted", details)
    const filter = browser.webRequest.filterResponseData(details.requestId);
    
    const decoder = new TextDecoder("utf-8");
    const encoder = new TextEncoder();
    let data = [];
    filter.ondata = (event) => {
        data.push(event.data);
        filter.write(event.data);
    }
    filter.onstop = (event) => {
        let jsonStr = "";

        if (data.length === 1) {
            jsonStr = decoder.decode(data[0]);
        } else {
            for (let i = 0; i < data.length; i++) {
                const stream = i !== data.length - 1;
                jsonStr += decoder.decode(data[i], { stream });
            }
        }
        try {
            var jsonObject = JSON.parse(jsonStr);
            if (details.url.includes("/v1/goals/performance")) {
                performanceData = jsonObject;
            } else if (details.url.includes("/v2/goals/investible")) {
                investibleData = jsonObject;
            } else if (details.url.includes("/v1/goals")) {
                summaryData = jsonObject;
            }
        } catch (error) {
            console.error("Error parsing JSON:", error);
        }
        filter.close();
    };
}
browser.webRequest.onBeforeRequest.addListener(
    portfolioDetailsIntercepter, { urls: apiUrls, types: ["xmlhttprequest"]},
    ["blocking"]
);

console.log("Background script loaded and intercepting Endowus API requests.");

function mergeAPIResponses() {
    if (performanceData && investibleData && summaryData) {
        const investibleMap = {};
        investibleData.forEach(item => investibleMap[item.goalId] = item);

        const summaryMap = {};
        summaryData.forEach(item => summaryMap[item.goalId] = item);

        // Group by goalBucket
        const bucketMap = {};

        performanceData.forEach(perf => {
            const invest = investibleMap[perf.goalId] || {};
            const summary = summaryMap[perf.goalId] || {};
            const goalName = invest.goalName || summary.goalName || "";
            const goalBucket = goalName.split(" ")[0] || "";
            const goalObj = {
                goalId: perf.goalId,
                goalName: goalName,
                goalBucket: goalBucket,
                goalType: invest.investmentGoalType || summary.investmentGoalType || "",
                totalInvestmentAmount: invest.totalInvestmentAmount?.display?.amount || null,
                totalCumulativeReturn: perf.totalCumulativeReturn?.amount || null,
                simpleRateOfReturnPercent: perf.simpleRateOfReturnPercent || null
            };

            if (!bucketMap[goalBucket]) {
                bucketMap[goalBucket] = {
                    total: 0
                }
            }
            if(!bucketMap[goalBucket][goalObj.goalType]){
                bucketMap[goalBucket][goalObj.goalType] = {
                    totalInvestmentAmount: 0,
                    totalCumulativeReturn: 0,
                    goals: []
                };
            }
            // Add to bucket
            bucketMap[goalBucket][goalObj.goalType].goals.push(goalObj);
            // Sum up
            if (typeof goalObj.totalInvestmentAmount === "number") {
                bucketMap[goalBucket][goalObj.goalType].totalInvestmentAmount += goalObj.totalInvestmentAmount;
                bucketMap[goalBucket].total += goalObj.totalInvestmentAmount;
            }
            if (typeof goalObj.totalCumulativeReturn === "number") {
                bucketMap[goalBucket][goalObj.goalType].totalCumulativeReturn += goalObj.totalCumulativeReturn;
            }
        });

        mergedInvestmentData = bucketMap;
    }
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background script received message:", request);
    if (request.action === "getInvestmentMapping") {
        mergeAPIResponses();
        sendResponse({'data': {'merged':mergedInvestmentData}});
    }
    return true;
});
