# slack-sprintreviewbot
slack bot to review existing and last Jira sprint details

Usage
sprintreview:<boardname>

Bot response will look something like:-
![alt tag](https://cloud.githubusercontent.com/assets/13842381/22191655/0a07c340-e153-11e6-9b11-fc2ceec5644c.png)

Update below in config.js
1)boards: {
	   <boardname>:<boardid>
},

Here enter the jira boardname and respective boardid.
The same board name will be used while giving command to sprintreview bot

2)  jira: {
    protocol: 'https',
    host: '',
    port: 443,
    base: '',
    user: '',
    pass: '',
    apiVersion: 'latest',
    strictSSL: false,
    regex: '([A-Z][A-Z0-9]+-[0-9]+)',
    sprintField: '',
    customFields: {

    },
Also enter the respective values here.

<TODO>

remove hardcoded authorization from lib/bot.js


