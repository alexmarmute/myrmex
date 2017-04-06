'use strict';

const path = require('path');
const Promise = require('bluebird');

/**
 * This module exports a function that enrich the interactive command line and return a promise
 * @returns {Promise} - a promise that resolve when the operation is done
 */
module.exports = (icli, lager) => {

  const config = {
    section: 'Lager CLI core',
    cmd: 'show-config',
    description: 'show the configuration of the project',
    parameters: [{
      cmdSpec: '-c, --colors',
      description: 'highlight output',
      type: 'confirm',
      default: true,
      question: {
        message: 'Do you want to use syntax highlighting?'
      }
    }]
  };


  /* istanbul ignore next */
  /**
   * Create the new project
   * @param {Object} parameters - the parameters provided in the command and in the prompt
   * @returns {Promise<null>} - The execution stops here
   */
  function executeCommand(parameters) {
    let config = JSON.stringify(lager.getConfig(), null, 2);
    if (parameters.colors) {
      config = icli.highlight(config, { json: true });
    }
    console.log(config);
  }

  /**
   * Create the command and the prompt
   */
  return icli.createSubCommand(config, executeCommand);
};