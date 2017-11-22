To clone and build NDEx Web App:

git clone https://github.com/ndexbio/ndex-webapp.git
cd ndex-webapp

To build a debug version:
- bower install
- type 3 when prompted

Unable to find a suitable version for angular, please choose one by typing one of the numbers below:
    1) angular#~1.2.11 which resolved to 1.2.32 and is required by angular-file-upload#1.1.6
    2) angular#>=1 <1.3.0 which resolved to 1.2.32 and is required by angular-bootstrap#0.12.0
    3) angular#1.3.15 which resolved to 1.3.15 and is required by angular-animate#1.3.15, angular-cookies#1.3.15, angular-resource#1.3.15, angular-route#1.3.15, angular-sanitize#1.3.15, angular-touch#1.3.15, ndex-webapp
    4) angular#>=1.3.x which resolved to 1.3.15 and is required by textAngular#1.5.16
    5) angular#>=1.2.0 which resolved to 1.3.15 and is required by ngclipboard#1.1.1
    6) angular#>=1.2.16 1.3.x which resolved to 1.3.15 and is required by angular-ui-grid#3.0.4

Prefix the choice with ! to persist it to bower.json

? Answer --> 3

To build a distriibution version:
npm install
grunt build
