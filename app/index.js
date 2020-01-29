const Twit = require('twit');
const fetch = require('node-fetch');
require('dotenv').config()

const TOPIC = process.env.TOPIC
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK

const twitterClient = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const twitterStream = twitterClient.stream('statuses/filter', {track: TOPIC});

twitterStream.on('tweet', async function(tweet) {
  const isTopicInUser = tweet.user && tweet.user.name && tweet.user.name.includes(TOPIC);
  if (!isTopicInUser){
    const slackBody = buildSlackBody(tweet);
    await sendToSlack(slackBody);
  }
});
twitterStream.on('limit', async function(message) {
  console.log('LIMIT', message);
  await sendToSlack({text: `TWITTER LIMIT: ${JSON.stringify(message)}`});
});
twitterStream.on('warning', async function(message) {
  console.log('WARNING', message);
  await sendToSlack({text: `TWITTER WARNING: ${JSON.stringify(message)}`});
});
twitterStream.on('user_event', async function(message) {
  console.log('USER EVENT', message);
  await sendToSlack({text: `TWITTER USER EVENT: ${JSON.stringify(message)}`});
});
twitterStream.on('unknown_user_event', async function(message) {
  console.log('UNKNOWN USER EVENT', message);
  await sendToSlack({text: `TWITTER UNKNOWN USER EVENT: ${JSON.stringify(message)}`});
});
twitterStream.on('error', async function(message) {
  console.log('ERROR', message);
  await sendToSlack({text: `TWITTER ERROR: ${JSON.stringify(message)}`});
});

function buildSlackBody({
  text,
  user,
  retweeted_status,
  id_str,
  extended_tweet
}) {
  const tweetText = (extended_tweet && extended_tweet.full_text) || text;
  const tweetLink = `https://twitter.com/${user.screen_name}/status/${id_str}`;
  if (typeof retweeted_status === 'object') {
    const reTweetUser = retweeted_status.user;
    const reTweetLink = `https://twitter.com/${reTweetUser.screen_name}/status/${retweeted_status.id_str}`;

    return {text: `*${user.name}* retweeted *${reTweetUser.name}*\n${'```'+ tweetText +'```'}\n${tweetLink}\n${reTweetLink}`};
  } else {
    return {text: `*${user.name}* tweeted\n${'```'+ tweetText +'```'}\n${tweetLink}`};
  }
}

async function sendToSlack(body) {
  try {
    const resp = await fetch(SLACK_WEBHOOK, {
      method: 'post',
      body:    JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
    await resp.text();
  } catch (err) {
    console.error(err)
  }
}

