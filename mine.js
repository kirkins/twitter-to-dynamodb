//NOTE checkout Object assign function
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign

// See config file for values needed on setup
const config = require('./config/config');
var lastReplied = 843197305843077100;
// If not provided a search term by user thorough an error
var searchTerm;
if(process.argv[2]){
  searchTerm = process.argv[2];
} else {
  console.log("Error: please provide query");
  process.exit();
}

const Twit = require('twit');
const sentiment = require('sentiment');
var AWS = require('aws-sdk');
AWS.config.update({region:'us-west-2'});
var dynamodb = new AWS.DynamoDB();

var Bot = new Twit({
  consumer_key: config.TWITTER_CONSUMER_KEY,
  consumer_secret: config.TWITTER_CONSUMER_SECRET,
  access_token: config.TWITTER_ACCESS_TOKEN,
  access_token_secret: config.TWITTER_ACCESS_TOKEN_SECRET
});

function tweetAnalysis() {

  var query = {
    q: searchTerm,
    count: 1,
    result_type: "recent",
    since_id: lastReplied
  }

  Bot.get('search/tweets', query, BotGotLatestTweet);

  function BotGotLatestTweet(error, data, response) {
    if (error) {
      console.log('Bot could not find latest tweet, : ' + error);
    } else {
      for (var i = 0, len = data.statuses.length; i < len; i++) {
	console.log(objectToDynamo(data.statuses[i]));
        //console.log(JSON.stringify(data.statuses[i]));
        //dynamodb.putItem({TableName: 'twitter', Item: t}, function(err, data){
        //  if (err) {
        //    console.log(err); // an error occurred
        //  } else {
        //    console.log(data); // successful response
        //  }
        //});
      }
    }
  }

  function analyzeTweet(tweet) {
    var tweetId = tweet.id_str;
    var username = tweet.screen_name;
    var tweetText = tweet.text;
    var r1 = sentiment(tweetText);
    var roundCompare = Math.round(r1.comparative * 10);
    return roundCompare;
  }

  function objectToDynamo(obj) {
    var dynoObj = {};
    for(var property in obj) {
     eval("dynoObj."+property+"={}");
     switch(typeof obj[property]) {
       case 'string': 
         eval("dynoObj."+property+".S='"+escape(obj[property])+"'");
	 break;
       case 'number': 
         eval("dynoObj."+property+".N='"+obj[property]+"'");
	 break;
       case 'boolean': 
         eval("dynoObj."+property+".BOOL='"+obj[property]+"'");
	 break;
       case 'object':
	 if(Array.isArray(obj[property]) && obj[property] != null && obj[property].length!=0) eval("dynoObj."+property+".L="+arrayToDynamo(obj[property]));
	 else eval("dynoObj."+property+".M="+objectToDynamo(obj[property]));
	 break;
     }
    }
    console.log(dynoObj);
    return dynoObj;
  }

  function arrayToDynamo(arr) {
    var dynoArr = [];
    for(var i = 0; i < arr.length; i++) {
      switch(typeof arr[i]) {
        case 'object':
          if(Array.isArray(arr[i]) && arr[i] != null && arr[i].length!=0) dynoArr[i] = arrayToDynamo(arr[i]);
          else dynoArr[i] = objectToDynamo(arr[i]);
          break;
        default:
          dynoArr[i] = arr[i];
      }
    }
    console.log(dynoObj);
    return dynoArr;
  }

}

var timer = setInterval(tweetAnalysis, config.TWEET_FREQUENCY * 60 * 60 * 10);
tweetAnalysis();
console.log("program started analyzing 100 tweets every " + config.TWEET_FREQUENCY +" minutes" );
console.log("Sentiment data will be shown as an array below");
