# IAM plugin

The `@myrmex/iam` plugin allows to define and deploy AWS policies and roles. It can be used to avoid referencing IAM
roles ARNs and simplify the configuration of other plugins.

## Prerequisites

To use the `@myrmex/iam` plugin, it is necessary to have a minimal knowledge about [AWS Identity and Access Management](https://aws.amazon.com/iam/).

An AWS user or role that uses the plugin `@myrmex/iam` must have access to IAM administration. The AWS policy `IAMFullAccess`
gives all necessary permissions.

## Installation

Install the npm module in a Myrmex project:

```shell
npm install @myrmex/iam --save-dev
```

Then enable the plugin in the `myrmex.json` file:

```json
{
  "name": "my-app",
  "plugins": [
    "@myrmex/iam"
  ]
}
```

## Commands

### create-policy

Usage:

```shell
create-policy [identifier]
```

Create a new IAM policy in `iam/policies/<identifier>.json`. The command does not configure the policy but just prepare the
file in the right place. By default it is `iam/policies/<identifier>.json`.

### create-role

Usage:

```shell
create-role [options] [identifier]

  Options:
    -m, --model <model-identifier>       select a model to quickly create the role configuration
    -p, --policies <policy-identifiers>  select the policies to attach to the role
```

Create a new IAM role. By default the location of roles is `iam/roles/<identifier>.json`.

Two predefined role configuration are available:

*   `APIGatewayLambdaInvocation`: The AWS policy `AWSLambdaRole` is attached to it and it can be associated to API Gateway
     endpoints.
*   `LambdaBasicExecutionRole`: The AWS policy `AWSLambdaBasicExecutionRole` is attached to it and it can be associated to
     Lambda functions.

It is possible to define custom policies and `trust-relationship` configuration. Is is also possible to reference
policies from the Myrmex project.

Roles can be referenced by other plugins to facilitate the deployment of Myrmex applications: by defining roles in the Myrmex
project, deploying some resources like Lambda functions or API definitions can be done on various environments without
needing to define specific configuration to reference different roles ARN.

### deploy-policies

Usage:

```shell
deploy-policies [options] [policy-identifiers]

  Options:
    -e, --environment [environment]  An environment identifier that will be used as a prefix
    -s, --stage [stage]              A stage identifier that will be used as a suffix
```

Deploy one or more policies in AWS. The `--environment` option is used as a prefix and the `--stage` option as a suffix.

### deploy-roles

Usage:

```shell
deploy-roles [options] [role-identifiers]

  Options:
    -e, --environment [environment]  An environment identifier that will be used as a prefix
    -s, --stage [stage]              A stage identifier that will be used as a suffix
```

Deploy one or more roles in AWS. The `environment` option is used as a prefix and the `stage` option as a suffix.

## Definition of IAM policies

The policies managed by Myrmex are nothing more than IAM policy definitions stored as JSON file. This allows to manage the
permissions needed by an application alongside the code.

Every time Myrmex has to deploy a policy, it checks if it needs to be created or updated and perform the appropriate action
if needed. If a policy already has 5 version (the maximum allowed by AWS), the oldest one will be deleted (unless it as been
defined as the default one).

## Definition of IAM roles

AWS roles can be configured with JSON files with `@myrmex/iam`. The structure looks like this:

```json
{
  "description": "Description of the role",
  "managed-policies": [
    "<policy-identifier>"
  ],
  "inline-policies": [
    "<policy-definition>"
  ],
  "trust-relationship": {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Service": "<service-identifier>"
      },
      "Action": "sts:AssumeRole"
    }]
  }
}
```

The *managed-policies* section contains a list of identifiers of IAM policies already deployed in AWS associated to the role.
During the deployment of a role, Myrmex will look for policies matching the identifiers in *managed-policies*, trying
combinations with the *environment* and the *stage* options:

*   `<environment>_<identifier>_<stage>`
*   `<environment>_<identifier>`
*   `<identifier>`

The *inline-policies* section contains a list of AIM policy definitions associated to the role.

The *trust-relationship* section contains the policy that describe the trusted entities that can assume the role

## Integration with `@myrmex/api-gateway`

`@myrmex/iam` add some functionalities to  `@myrmex/api-gateway` when both are installed in the same project.

### Simplify the association of an API endpoint with its invocation role

In the [`spec.json`](/manual/usage/api-gateway-plugin.html#project-anatomy) file that describes an endpoint, the invocation
role is configured via the [API Gateway extension to Swagger]
(http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-integration.html) using the
property `credentials`. It accepts the ARN of an IAM role. Using `@myrmex/iam`, it is also possible configure this property
using the identifier of a role defined in the Myrmex project or the name of a role deployed in AWS.

### New behavior for the option `--role <role>` of `myrmex create-endpoint`

This option normally accepts the ARN of a role. With the plugin `@myrmex/iam`, it also accepts the identifier of an role
defined in the Myrmex project or the name of a role deployed in AWS.

If the option is not provided in the command line, a prompt will propose three option to set the value:

* Select a role managed by the plugin @myrmex/iam
* Select a role in your AWS account
* Enter the value manually

## Integration with `@myrmex/lambda`

`@myrmex/iam` add some functionalities to  `@myrmex/lambda` when both are installed in the same project.

### Simplify the association of a Lambda with its execution role

In the [`config.json`](https://myrmex-org.github.io/manual/usage/lambda-plugin.html#project-anatomy) file that describes the
configuration of a Lambda, the invocation role is configured via the using the property `params.role`. It accepts the ARN of
an IAM role. Using `@myrmex/iam`, it is also possible configure this property using the identifier of a role defined in the
Myrmex project or the name of a role deployed in AWS.

### New behavior for the option `--role <role>` of `myrmex create-lambda`

This option normally accepts the ARN of a role. With the plugin `@myrmex/iam`, it also accepts the identifier of an role
defined in the Myrmex project or the name of a role deployed in AWS.

If the option is not provided in the command line, a prompt will propose three option to set the value:

* Select a role managed by the plugin @myrmex/iam
* Select a role in your AWS account
* Enter the value manually

## Hooks and extensions

### Hooks

`beforePoliciesLoad()`

`beforePolicyLoad(definitionFilePath, name)`

`afterPolicyLoad(policy)`

`afterPoliciesLoad(policies)`

`beforeRolesLoad()`

`beforeRoleLoad(definitionFilePath, name)`

`afterRoleLoad(role)`

`afterRolesLoad(roles)`

`beforeDeployPolicy(policy)`

`beforeDeployRole(role)`

### Extensions

`myrmex.call('iam:getRoles')` returns the roles managed in the current Myrmex project.

`myrmex.call('iam:getAWSRole')` returns the roles available in AWS.

`myrmex.call('iam:retrieveRoleArn', identifier, context)` retrieve the ARN of an IAM role using its identifier. Tries
combinations with the `environment` and the `stage` properties of the `context` parameter in this order:

*   `<environment>_<identifier>_<stage>`
*   `<environment>_<identifier>`
*   `<identifier>`.
