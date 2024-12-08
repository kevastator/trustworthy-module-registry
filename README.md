# Trustworthy Module Registry
This system acts as a repository for npm packages deemed stable by a metric system.  The metric system (rating.ts) tests the Github repository of the given npm package.  This is read either with a link to the package repository (works for npm and github) or a zip file containing the package.  The metric will check a number of metrics like the bus factor of the package developers, the amount of dependencies that are supported for minor bug fixes, and whether the license is in compliance with the company’s requirement.  Once a package is successfully uploaded, it will be available to other developers with the website’s link or the REST api backend system.  There are a number of features on the website (endpoints on the REST api) that can retrieve useful information about the packages using search for package by regex, a calculation of the amount of space the repository is to download (in MB) with or without its dependencies, and a way to bring up a directory view of packages using name and version as search queries.  Overall, this system provides a simple way to keep packages company compliant while also being straightforward enough for a developer to save time on as well.

# Configuration
Many of the endpoints are not technically highly configurable, but the metric system has a class based metric weight system in the rate.ts file.  Developers can write their own metric classes for which packages should pass through and weight them accordingly.  Likewise developers can remove metrics they may not consider to be important.

# Deploy
The way to deploy this project is by using AWS lambda functions to ship each endpoint on.  For reference on how the dependencies and functions are uploaded see the github workflow files.  The easiest way to get this working would be to fork this repository and use github secrets to fill in the proper AWS details (token, region, etc).  You will also want to save an .env string for the secrets as well when the code is deployed (see deployment file).  Make sure it includes:

```
GITHUB_TOKEN=<your_github_token_here>
LOG_LEVEL=1
LOG_FILE=tmp/logs/my_log.txt
AWS_REGION=<your_aws_region_here>
```

# Interaction
Use the endpoints according to how you set it up in (preferably in API Gateway) AWS.  Build an API spec according to the return codes in each endpoint function.  The implemented endpoints include:

* upload package
* update package
* download package
* get package repository view
* get packages by regular expression
* get package download cost in MB
* get package metric scores
* reset the registry (caution deletes all uploaded packages)
