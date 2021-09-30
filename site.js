const http = require("http");
const url = require('url');
const fs = require('fs');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const merge = require('deepmerge');

//Settings
const SERVER_HOST = '192.168.0.100'
const SERVER_PORT = '3000'


class PromontReports {


    extractHostname(url) {
        var hostname;

        if (url.indexOf("//") > -1) {
            hostname = url.split('/')[2];
        } else {
            hostname = url.split('/')[0];
        }

        hostname = hostname.split(':')[0];
        hostname = hostname.split('?')[0];
        //hostname = hostname.replace('.', '_');

        return hostname;
    }

    report(siteurl, cfg) {
        this.siteurl = siteurl;
        this.cfg = cfg;
        let options = [];

        switch (this.cfg) {
            case 'desktop':
                options = this.desktopCfg();
                break;
            default:
                options = this.mobileCfg();

        }

        const options_global = {
            locale: 'ru',
            outputPath: './reports/' + options.preset + '_' + this.extractHostname(this.siteurl),
            //onlyCategories: ["seo"],
            port: 9222,
        }
        const params = merge(options, options_global)


        console.log('url', this.siteur);
        console.log('params', siteurl, params);
        return this.launchChromeAndRunLighthouse(this.siteurl, params);
    }

    desktopCfg() {

        const cfg = {
            formFactor: 'desktop',
            preset: 'desktop',
            screenEmulation: {
                mobile: false,
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
                disabled: false
            }
        }
        return cfg;
    }

    mobileCfg() {
        const cfg = {
            formFactor: 'mobile',
            preset: 'mobile'
        }
        return cfg;
    }

    launchChromeAndRunLighthouse(url, flags, config = null) {
        return chromeLauncher.launch().then(async chrome => {
            flags.port = chrome.port;

            flags.output = 'html';
            const runnerResult = await lighthouse(url, flags, config);
            const reportHtml = runnerResult.report;
            fs.writeFileSync(flags.outputPath + '.html', reportHtml);

            flags.output = 'json';
            const runnerResultJson = await lighthouse(url, flags, config);
            const reportJson = runnerResultJson.report;
            fs.writeFileSync(flags.outputPath + '.json', reportJson);

            await chrome.kill();
            return {jsonData: reportJson, htmlData: reportHtml};
        });
    }

    run() {
        const repMethods = this;
        http.createServer(async function (request, response) {


                response.setHeader("Content-Type", "text/html; charset=utf-8;");

                var queryData = url.parse(request.url, true).query;

                let output = 'Загрузка...';

                if (typeof queryData.site !== 'undefined') {

                    let responeData = await repMethods.report(queryData.site, queryData.preset);
                    output = responeData.htmlData;

                } else {
                    output = 'Укажите GET параметр `site`<br>' +
                        'Пример: ' +
                        '<br>http://' + SERVER_HOST + ':' + SERVER_PORT + '/?site=https://mstrok.ru&preset=desktop' +
                        '<br>http://' + SERVER_HOST + ':' + SERVER_PORT + '/?site=https://mstrok.ru&preset=mobile';
                }
                response.end(output);

            }
        ).listen(
            SERVER_PORT
            ,
            SERVER_HOST
        );
    }

}

let innitClass = new PromontReports();
innitClass.run();
module.exports = PromontReports;

