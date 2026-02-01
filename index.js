const GenAI = require("@google/generative-ai");
const { TwitterApi } = require("twitter-api-v2");
const SECRETS = require("./SECRETS");

const twitterClient = new TwitterApi({
  appKey: SECRETS.APP_KEY,
  appSecret: SECRETS.APP_SECRET,
  accessToken: SECRETS.ACCESS_TOKEN,
  accessSecret: SECRETS.ACCESS_SECRET,
});

const generationConfig = {
  maxOutputTokens: 400,
};
const genAI = new GenAI.GoogleGenerativeAI(SECRETS.GEMINI_API_KEY);

async function run() {
  try {
    // Step 1: Get real current trends for India (WOEID 23424848 = India nationwide)
    const trendsResponse = await twitterClient.v1.trendsPlace(23424848);
    const trends = trendsResponse[0]?.trends || []; // Array of { name, tweet_volume, ... }

    // Take top 5 trends (filter out low-volume or non-relevant if needed)
    const topTrends = trends
      .slice(0, 5)
      .map(t => t.name)
      .join(", ");

    console.log("Current Indian trends:", topTrends);

    // Step 2: Build dynamic prompt with real trends
    const prompt = `Generate a concise, opinionated tweet (max 280 characters) commenting on one or more of these currently trending topics on Indian X/Twitter: ${topTrends}.

Tone: sharp, relatable, slightly witty.
Style: native Indian Twitter vibe (memes, cricket, politics, tech, culture, viral moments).
Avoid hashtags overload (0–2 max).
No emojis unless they add meaning.
Make it feel like a real human reacting in the moment, not a news headline.
Focus on commentary, observation, or a light rant—not reporting facts.`;

    // Step 3: Generate tweet with Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
      generationConfig,
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    console.log("Generated tweet:", text);

    // Step 4: Post it
    await sendTweet(text);
  } catch (error) {
    console.error("Error in run():", error);
  }
}

async function sendTweet(tweetText) {
  try {
    const posted = await twitterClient.v2.tweet(tweetText);
    console.log("Tweet sent successfully! ID:", posted.data.id);
  } catch (error) {
    console.error("Error sending tweet:", error?.data || error);
  }
}

// Run the bot
run();
