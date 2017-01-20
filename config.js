'use strict';

const config = {
  jira: {
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
	boards: {
	   <boardname>:<boardid>
	},
    response: 'full' // full or minimal
  },
  slack: {
    token: '',
    autoReconnect: true
  },
  usermap: {},
  details: [],
  sprintdetail: {}
};
module.exports = config;
