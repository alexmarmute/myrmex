'use strict';

const lager = require('@lager/lager/lib/lager');
const Promise = lager.import.Promise;
const _ = lager.import._;

const AWS = require('aws-sdk');
const iamHelper = require('./helper');

/**
 * Constructor function
 * @param {Object} document - policy document
 * @param {string} name - policy name
 * @constructor
 */
let Policy = function Policy(document, name, pathPrefix) {
  this.document = document;
  this.name = name;
  this.pathPrefix = pathPrefix || '/';
};

/**
 * Deploy a policy
 * @param String pathToPolicy
 * @returnsPromise
 */
Policy.prototype.deploy = function deploy(stage, environment) {
  const awsIAM = new AWS.IAM();
  const name = this.name;

  return lager.fire('beforeDeployPolicy', this)
  .spread(() => {
    var params = {
      PathPrefix: this.pathPrefix,
      OnlyAttached: false,
      Scope: 'Local'
    };
    return iamHelper.getPolicyByName(awsIAM, name, params);
  })
  .then((currentPolicy) => {
    if (currentPolicy) {
      // If the function already exists
      console.log('   * The policy ' + name + ' already exists');
      return this.updateIfNeeded(awsIAM, currentPolicy);
    } else {
      // If error occured because the function does not exists, we create it
      console.log('   * The policy ' + name + ' does not exists');
      return this.create(awsIAM, name);
    }
  })
  .then((data) => {
    // Publish a new version
    console.log('   * Policy ' + name + ' deployed');
    return lager.fire('afterDeployPolicy', this);
  })
  .spread(() => {
    return Promise.resolve(this);
  });
};

/**
 * [create description]
 * @param {[type]} awsIAM      [description]
 * @param {[type]} stage       [description]
 * @param {[type]} environment [description]
 * @returns {[type]}             [description]
 */
Policy.prototype.create = function create(awsIAM, stage, environment) {
  const params = {
    PolicyDocument: JSON.stringify(this.document),
    PolicyName: this.name,
    Description: 'Policy generated by Lager',
    Path: this.pathPrefix
  };
  return Promise.promisify(awsIAM.createPolicy.bind(awsIAM))(params);
};

/**
 * [update description]
 * @param {[type]} awsIAM      [description]
 * @param {[type]} stage       [description]
 * @param {[type]} environment [description]
 * @returns {[type]}             [description]
 */
Policy.prototype.updateIfNeeded = function updateIfNeeded(awsIAM, currentPolicy) {
  const params = {
    PolicyArn: currentPolicy.Arn,
    VersionId: currentPolicy.DefaultVersionId
  };
  return Promise.promisify(awsIAM.getPolicyVersion.bind(awsIAM))(params)
  .then((data) => {
    if (unescape(data.PolicyVersion.Document) === this.document) {
      console.log('   * The policy is already up-to-date');
      return Promise.resolve(currentPolicy);
    } else {
      console.log('   * The policy must be updated');
      return this.update(awsIAM, currentPolicy.Arn);
    }
  });
};

/**
 * [update description]
 * @param {[type]} awsIAM    [description]
 * @param {[type]} policyArn [description]
 * @returns {[type]}           [description]
 */
Policy.prototype.update = function update(awsIAM, policyArn) {
  return Promise.promisify(awsIAM.listPolicyVersions.bind(awsIAM))({ PolicyArn: policyArn })
  .then((data) => {
    if (data.Versions.length < 5) {
      // If the policy has less than 5 versions, we can create a new version
      return this.createPolicyVersion(awsIAM, policyArn);
    } else {
      // If the policy already has 5 versions, we have to delete the oldest one
      // Look for the smallest version number
      console.log('   * 5 versions exist already');
      const minVersion = _.reduce(data.Versions, function(result, value, key) {
        if (value.IsDefaultVersion || value.VersionId > result) {
          return result;
        }
        return value.VersionId;
      }, Infinity);
      console.log('   * Deleting version ' + minVersion);
      const params = {
        PolicyArn: policyArn,
        VersionId: minVersion
      };
      return Promise.promisify(awsIAM.deletePolicyVersion.bind(awsIAM))(params)
      .then(() => {
        return this.createPolicyVersion(awsIAM, policyArn);
      });
    }
  });
};

/**
 * Create a policy version
 * @param String policyArn
 * @param String policyDocument
 * @returnsPromise
 */
Policy.prototype.createPolicyVersion = function(awsIAM, policyArn) {
  // @TODO We should SetAsDefault only once the deployment is performed
  console.log('   * Creating a new version');
  var params = {
    PolicyArn: policyArn,
    PolicyDocument: JSON.stringify(this.document),
    SetAsDefault: true
  };
  return Promise.promisify(awsIAM.createPolicyVersion.bind(awsIAM))(params);
};

module.exports = Policy;
