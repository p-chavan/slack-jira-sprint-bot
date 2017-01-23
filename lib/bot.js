'use strict';

const Botkit = require('botkit');
const J2S = require('jira2slack');
const logger = require('./logger')();
const request = require('request');
const rp = require('request-promise');
const Promise = require("bluebird");
/**
 * @module Bot
 */
class Bot {
  /**
   * Constructor.
   *
   * @constructor
   * @param {Config} config The final configuration for the bot
   */
  constructor (config) {
    this.config = config;
    this.controller = Botkit.slackbot({
      logger
    });
  }

constructRequest(url) {
  //let header = this.config.user + ':' +this.config.pass;
  //let encheader = new Buffer(header).toString('base64');
  //let  finalheader = 'Basic ' + encheader;
   let requestCall = {
                        uri: url ,
                        headers : {
                                        "Authorization" : "Basic"
                                },
                        json: true
     };
   return requestCall;
}

populateResponse(apiResponse){


                let sprintdata = apiResponse;
                let sprintdetail = {};
                sprintdetail.title = sprintdata.sprint.name
                
                sprintdetail.mrkdwn_in = ["text"];
                sprintdetail.fields = [];
                let issuesaddedDuringSprint = sprintdata.contents.issueKeysAddedDuringSprint;
    let allissues = sprintdata.contents.completedIssues.concat(sprintdata.contents.issuesNotCompletedInCurrentSprint,sprintdata.contents.puntedIssues)
    let allissuesStoryPoints = allissues.filter(function(elm,i){
      if ((elm.key in issuesaddedDuringSprint))
      {
          return false
      }
      return true;
    });

    let storypointCalculateInitial = allissuesStoryPoints.reduce(function(a,b){
      if(b.estimateStatistic && !isNaN(b.estimateStatistic.statFieldValue.value)){
      return a+b.estimateStatistic.statFieldValue.value;
      }
      return a;
    },0);
    sprintdetail.fields.push({
        title: "Initial Story Points:",
        value: storypointCalculateInitial,
          short: true
    });
    sprintdetail.fields.push({
        title: "Completed Story Points:",
        value: sprintdata.contents.completedIssuesEstimateSum.value,
          short: true
    });
    sprintdetail.fields.push({
      title: "Start Date:",
      value: sprintdata.sprint.startDate,
        short: true
    });
    sprintdetail.fields.push({
      title: "End date:",
      value: sprintdata.sprint.endDate,
        short: true
    });
    sprintdetail.fields.push({
      title: "Completed issues:",
      value: sprintdata.contents.completedIssues.length,
        short: true
    });
    sprintdetail.fields.push({
      title: "Issues not completed:",
      value: sprintdata.contents.issuesNotCompletedInCurrentSprint.length,
        short: true
    });
    sprintdetail.fields.push({
      title: "Issues added during sprint:",
      value:Object.keys(sprintdata.contents.issueKeysAddedDuringSprint).length,
        short: true
    });
    sprintdetail.fields.push({
      title: "Punted Issues:",
      value: sprintdata.contents.puntedIssues.length,
        short: true
    });

    return sprintdetail;


}
loop(startAt,boardId) {
   let self = this;
    return Promise.try(function() {
       let closedSprintUrl = "https://" + self.config.jira.host + "/rest/agile/1.0/board/"+boardId+"/sprint?state=closed&startAt="+startAt
       return rp(self.constructRequest(closedSprintUrl));
    }).then(function(response) {
       if (!response.isLast) {
            return Promise.try(function() {
               startAt = response.startAt + response.maxResults;
         logger.info(`${startAt} ${boardId}`);
               return self.loop(startAt, boardId);
            }).then(function(recursiveResults) {
                return recursiveResults;
            });
        } else {
            // Done looping
            return response;
        }
    });
 }


  sprintResponse (boardId,message) {
        let self = this;
      let getActiveSprintId = "https://" + self.config.jira.host + "/rest/agile/1.0/board/"+boardId+"/sprint?state=active";
        rp(self.constructRequest(getActiveSprintId)).promise().bind(self)
        .then(function (body) {
                        let data = body;
                        let allboarddetails = data.values;
                        logger.info(`in first call`);
                        for (let i =0; i < allboarddetails.length; i++){
                                let getActiveSprintReport = "https://" + self.config.jira.host + "/rest/greenhopper/1.0/rapid/charts/sprintreport?rapidViewId="+allboarddetails[i].originBoardId+"&sprintId="+allboarddetails[i].id;
                                logger.info(`contructed otherurl ${getActiveSprintReport}`);
                                return rp(self.constructRequest(getActiveSprintReport));

                         }
        }).then(function (responsebody) {
                let resp = { attachments : []};
                let response = [];
                this.bot.reply(message,"Current Sprint Details:",null);
                response.push(self.populateResponse(responsebody));
                logger.info(`${response}`)
                resp.attachments = response;
                self.bot.reply(message, resp, null);
               
        }).catch(function (err) {
     // API call failed...
                logger.info(`${err}`)
                self.bot.reply(message, "Unable to get the data"+err, null);
         });

  Promise.try(function() {
        let i = 0;
        return self.loop(0,boardId);
        }).then(function(results) {
        // Now `results` is an array that contains the response for each HTTP request made.
     logger.info(`looking for this ${results.maxResults} ${results.isLast} ${results.values.length}`)
          
                let data = results;
                let allboarddetails = data.values;
                logger.info(`in first call`);
                let i = allboarddetails.length - 1;
                let closedSprintDetails ="https://" + self.config.jira.host + "/rest/greenhopper/1.0/rapid/charts/sprintreport?rapidViewId="+allboarddetails[i].originBoardId+"&sprintId="+allboarddetails[i].id;
                logger.info(`contructed closedSprintDetails ${closedSprintDetails}`);
                return rp(self.constructRequest(closedSprintDetails));
        }).then(function (responsebody) {
                let lastsprintretro = '';
                let resp = { attachments : []};
                let response = [];
                self.bot.reply(message,"Last Sprint Details:",null);
                response.push(self.populateResponse(responsebody));
                logger.info(`${response}`)
                resp.attachments = response;
                self.bot.reply(message, resp, null);
                lastsprintretro = "Sprint Retro :- https://" + self.config.jira.host + "/secure/RapidBoard.jspa?rapidView="+boardId+"&view=reporting&chart=sprintRetrospective";
                                self.bot.reply(message, lastsprintretro, null);
        }).catch(function (err) {
     // API call failed...
                logger.info(`${err}`)
                self.bot.reply(message, "Unable to get the data"+err, null);
         });

  }


  /**
   * Parse out JIRA tickets from a message.
   * This will return unique tickets that haven't been
   * responded with recently.
   *
   * @param {string} channel the channel the message came from
   * @param {string} message the message to search in
   * @return {string[]} an array of tickets, empty if none found
   */
  parseMessage (channel, message) {
    let retVal = '';
    let board = '';
    if (!channel || !message) {
      return retVal;
    }
    if (message.indexOf("sprintreview:") !== -1)
    {
                retVal=message.substr(message.indexOf(":")+1)
    }

    return retVal;
  }

 
  /**
   * Function to be called on slack open
   *
   * @param {object} payload Connection payload
   * @return {Bot} returns itself
   */
  slackOpen (payload) {
    const channels = [];
    const groups = [];
    const mpims = [];

    logger.info(`Welcome to Slack. You are @${payload.self.name} of ${payload.team.name}`);

    if (payload.channels) {
      payload.channels.forEach((channel) => {
        if (channel.is_member) {
          channels.push(`#${channel.name}`);
        }
      });

      logger.info(`You are in: ${channels.join(', ')}`);
    }

    if (payload.groups) {
      payload.groups.forEach((group) => {
        groups.push(`${group.name}`);
      });

      logger.info(`Groups: ${groups.join(', ')}`);
    }

    if (payload.mpims) {
      payload.mpims.forEach((mpim) => {
        mpims.push(`${mpim.name}`);
      });

      logger.info(`Multi-person IMs: ${mpims.join(', ')}`);
    }

    return this;
  }

  /**
   * Handle an incoming message
   * @param {object} message The incoming message from Slack
   * @returns {null} nada
   */
  handleMessage (message) {
    const response = {
      as_user: true,
      attachments: []
    };
    let boardId = '';

    if (message.type === 'message' && message.text) {
      const found = this.parseMessage(message.channel, message.text);
      if (found && found.length) {
                logger.info(`Detected ${found}`);
                if (this.config.jira.boards && Object.keys(this.config.jira.boards).length && this.config.jira.boards[""+found+""]) {
                          boardId = this.config.jira.boards[""+found+""];
                          logger.info(`Detected ${boardId}`);
                          this.sprintResponse.call(this,boardId,message);

                } else {
                                                  logger.info(`@${this.bot.identity.name} could not respond.`);
                                                  let errResp = {};
                                                  let availableBoard = "";
                                                  errResp.title = " Please check if you have entered valid board name. Please enter sprintreview:<boardname>. Available boards are : "

                                                                  if (this.config.jira.boards && Object.keys(this.config.jira.boards).length) {
                                                                                Object.keys(this.config.jira.boards).map((board) => {
                                                                                                 availableBoard += board + ",";
                                                                                                 logger.info(`${board}`, response);
                                                                                });
                                                                  }
                                                  errResp.text= availableBoard;
                                                  response.attachments.push(errResp)
                                                  this.bot.reply(message,response,null);
                }
          }
        }
  }

  /**
   * Start the bot
   *
   * @return {Bot} returns itself
   */
  start () {
    this.controller.on(
      'direct_mention,mention,ambient,direct_message',
      (bot, message) => {
        this.handleMessage(message);
      }
    );

    this.controller.on('rtm_close', () => {
      logger.info('The RTM api just closed');

      if (this.config.slack.autoReconnect) {
        this.connect();
      }
    });

    this.connect();

    return this;
  }

  /**
   * Connect to the RTM
   * @return {Bot} this
   */
  connect () {
    this.bot = this.controller.spawn({
      token: this.config.slack.token,
      retry: this.config.slack.autoReconnect ? Infinity : 0
    }).startRTM((err, bot, payload) => {
      if (err) {
        logger.error('Error starting bot!', err);
      }

      this.slackOpen(payload);
    });

    return this;
  }
}

module.exports = Bot;

