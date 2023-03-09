import http from 'k6/http';
import { check } from 'k6';

export const options = {
    vus: 100,
    duration: '3m',
    thresholds: {
        http_req_duration: ['p(99)<1500'], // 99% of requests must complete below 1.5s
    },
};

const filters = [
    'fit-in/50x50/filters:quality(75)/',
    'fit-in/80x80/filters:quality(50)/',
    'fit-in/200x200/filters:quality(100)/'
];

const chartSIH = 'https://sih-st-charts.stocktwits-cdn.com/';
const avatarSIH = 'https://sih-st-avatars.stocktwits-cdn.com/';

const testEndpoint = {
    charts: 0,
    avatars: 1,
};

// const OPT = testEndpoint.charts;
const OPT = testEndpoint.avatars;

const externalIMGs = [
    "https://ichef.bbci.co.uk/news/976/cpsprodpb/37B5/production/_89716241_thinkstockphotos-523060154.jpg",
    "https://static.theprint.in/wp-content/uploads/2020/12/randomnumber.jpg",
    "https://img.freepik.com/free-photo/black-glitch-effect-texture_53876-94626.jpg",
    "https://img.freepik.com/free-vector/waves-colorful-points-digital-data-splash-point-array-futuristic-smooth-glitch-ui-element_1217-6307.jpg?size=626&ext=jpg",
    "https://img.freepik.com/free-vector/no-signal-broadcasting-chaos-pixels-background-design_1017-27173.jpg?size=626&ext=jpg",
    "https://img.freepik.com/premium-psd/glitch-photo-effect-template_393628-373.jpg?size=626&ext=jpg",
    "https://img.freepik.com/free-vector/landing-page-template-with-mobile-phishing_23-2148559129.jpg?size=626&ext=jpg",
    "https://www.marketbeat.com/logos/cassava-sciences-inc-logo.PNG",
    "https://www.marketbeat.com/logos/articles/thumb_20230308091723_crowdstrike-while-the-iron-is-hot.jpg",
];

const externalGIFs = [
    "https://media.giphy.com/media/4xWGyVKoXqg2eVCiq9/giphy.gif",
    "https://media.giphy.com/media/B7o99rIuystY4/giphy.gif",
    "https://media.giphy.com/media/3orifaGGghuf3hnmsE/giphy.gif",
    "https://media.giphy.com/media/R0nn6JhamSFd2LlP6B/giphy.gif",
    "https://media.giphy.com/media/Pj6F2C4F46BrAVwLe1/giphy.gif",
    "https://media.giphy.com/media/XuA6TJBp9EP9ntJjVe/giphy.gif",
    "https://media.giphy.com/media/SRkVigbErPKC5KW2VG/giphy.gif",
    "https://media.giphy.com/media/pdSncNyYgaH0wqaCqp/giphy.gif",
    "https://media.giphy.com/media/JtqQOOqEdboHSREBmt/giphy.gif",
    "https://media.giphy.com/media/B7o99rIuystY4/giphy.gif"
];

const largeIMGs = [
    `https://upload.wikimedia.org/wikipedia/commons/2/2d/Snake_River_%285mb%29.jpg`,
    `https://upload.wikimedia.org/wikipedia/commons/c/c9/Tiligul_liman_5_Mb.jpg`,
];

const s3Avatars = [
    "production/695596/large-1639678584.png",
    "production/1001139/large-1636951271.png",
    "production/1001139/medium-1636951271.png",
    "production/1001139/thumb-1636951271.png",
    "production/1001139/tiny-1636951271.png",
    "production/100114/large-1313120647.png",
    "production/100114/medium-1313120647.png",
    "production/100114/thumb-1313120647.png",
    "production/100114/tiny-1313120647.png",
    "production/1001140/large-1501768203.png",
    "production/1001140/medium-1501768203.png",
    "production/1001140/thumb-1501768203.png",
    "production/1001140/tiny-1501768203.png",
    "production/1001155/large-1508191318.png",
    "production/1001155/medium-1508191318.png",
    "production/1001155/thumb-1508191318.png",
    "production/1001155/tiny-1508191318.png",
    "production/1001161/large-1515176457.png",
    "production/1001161/medium-1515176457.png",
    "production/1001161/thumb-1515176457.png",
    "production/1001161/tiny-1515176457.png",
    "production/1001163/large-1490035682.png",
    "production/1001163/medium-1490035682.png",
    "production/1001163/thumb-1490035682.png",
    "production/1001163/tiny-1490035682.png",
    "production/1001197/large-1490054720.png",
    "production/1001197/medium-1490054720.png",
    "production/1001197/thumb-1490054720.png",
    "production/1001197/tiny-1490054720.png",
    "production/1001203/large-1497971575.png",
    "production/1001203/medium-1497971575.png",
    "production/1001203/thumb-1497971575.png",
    "production/1001203/tiny-1497971575.png",
    "production/100121/large-1432669476.png",
    "production/100121/medium-1432669476.png",
    "production/100121/thumb-1432669476.png",
    "production/100121/tiny-1432669476.png",
    "production/1001214/large-1522009790.png",
    "production/1001214/medium-1522009790.png",
    "production/1001214/thumb-1522009790.png",
    "production/1001214/tiny-1522009790.png",
    "production/100123/large-1447269556.png",
    "production/100123/medium-1447269556.png",
    "production/100123/thumb-1447269556.png",
    "production/100123/tiny-1447269556.png",
    "production/1001240/large-1563819594.png",
    "production/1001240/medium-1563819594.png",
    "production/1001240/thumb-1563819594.png",
    "production/1001240/tiny-1563819594.png",
    "production/1001242/large-1489904073.png",
    "production/1001242/medium-1489904073.png",
    "production/1001242/thumb-1489904073.png",
    "production/1001242/tiny-1489904073.png",
    "production/1001258/large-1489934703.png",
    "production/1001258/medium-1489934703.png",
    "production/1001258/thumb-1489934703.png",
    "production/1001258/tiny-1489934703.png",
    "production/1001268/large-1489908895.png",
    "production/1001268/medium-1489908895.png",
    "production/1001268/thumb-1489908895.png",
    "production/1001268/tiny-1489908895.png",
    "production/1001276/large-1489956392.png",
    "production/1001276/medium-1489956392.png",
    "production/1001276/thumb-1489956392.png",
    "production/1001276/tiny-1489956392.png",
    "production/1001282/large-1490287992.png",
    "production/1001282/medium-1490287992.png",
    "production/1001282/thumb-1490287992.png",
    "production/1001282/tiny-1490287992.png",
    "production/1001294/large-1540939317.png",
    "production/1001294/medium-1540939317.png",
    "production/1001294/thumb-1540939317.png",
    "production/1001294/tiny-1540939317.png",
    "production/1001297/large-1634214554.png",
    "production/1001297/medium-1634214554.png",
    "production/1001297/thumb-1634214554.png",
    "production/1001297/tiny-1634214554.png",
    "production/1001420/large-1489937041.png",
    "production/1001420/medium-1489937041.png",
    "production/1001420/thumb-1489937041.png",
    "production/1001420/tiny-1489937041.png"
];

const s3Charts = [
    "production/large_100000048.png",
    "production/medium_100000048.png",
    "production/large_10000006.png",
    "production/medium_10000006.png",
    "production/large_100000060.png",
    "production/medium_100000060.png",
    "production/large_100000091.png",
    "production/medium_100000091.png",
    "production/large_100000101.png",
    "production/medium_100000101.png",
    "production/original_100000101.png",
    "production/large_100000104.jpg",
    "production/medium_100000104.jpg",
    "production/original_100000104.jpg",
    "production/large_100000112.png",
    "production/medium_100000112.png",
    "production/original_100000112.png",
    "production/large_100000137.png",
    "production/medium_100000137.png",
    "production/original_100000137.png",
    "production/large_100000148.png",
    "production/medium_100000148.png",
    "production/original_100000148.png",
    "production/large_100000170.png",
    "production/medium_100000170.png",
    "production/original_100000170.png",
    "production/large_100000173.gif",
    "production/medium_100000173.gif",
    "production/original_100000173.gif",
    "production/large_100000174.png",
    "production/medium_100000174.png",
    "production/original_100000174.png",
    "production/large_100000176.jpg",
    "production/medium_100000176.jpg",
    "production/original_100000176.jpg",
    "production/large_100000179.png",
    "production/medium_100000179.png",
    "production/original_100000179.png",
    "production/large_100000183.png",
    "production/medium_100000183.png",
    "production/original_100000183.png",
    "production/large_100000184.png",
    "production/medium_100000184.png",
    "production/original_100000184.png",
    "production/large_100000185.png",
    "production/medium_100000185.png",
    "production/original_100000185.png",
    "production/large_100000186.PNG",
    "production/medium_100000186.PNG",
    "production/original_100000186.PNG",
    "production/large_100000187.png",
    "production/medium_100000187.png",
    "production/original_100000187.png",
    "production/large_100000188.png",
    "production/medium_100000188.png",
    "production/original_100000188.png",
    "production/large_100000189.png",
    "production/medium_100000189.png",
    "production/original_100000189.png",
    "production/large_100000194.png",
    "production/medium_100000194.png",
    "production/original_100000194.png",
    "production/large_100000195.png",
    "production/medium_100000195.png",
    "production/original_100000195.png",
    "production/large_100000196.png",
    "production/medium_100000196.png",
    "production/original_100000196.png",
    "production/large_100000198.png",
    "production/medium_100000198.png",
    "production/original_100000198.png",
    "production/large_100000200.png",
    "production/medium_100000200.png",
    "production/original_100000200.png"
];

const bucketIMGs = (OPT == testEndpoint.avatars ? s3Avatars : s3Charts);

const groups = [
    externalIMGs,
    externalGIFs,
    bucketIMGs,
    largeIMGs,
];

export default function() {

    const URL = (OPT == testEndpoint.avatars ? avatarSIH : chartSIH);

    for (let i = 0; i < groups.length; i++) {
        for (let j = 0; j < groups[i].length; j++) {
            for (let k = 0; k < filters.length; k++) {
                const testURL = URL + filters[k] + groups[i][j];
                const res = http.get(testURL);
                check(res, {
                    'status was 200': (r) => r.status === 200,
                    'duration < 1s': (r) => r.timings.waiting + r.timings.receiving < 1000,
                    'duration < 2s': (r) => r.timings.waiting + r.timings.receiving <= 2000,
                    'duration < 3s': (r) => r.timings.waiting + r.timings.receiving <= 3000,
                });
                if (res.status !== 200) {
                    console.log(testURL, res.status);
                }
            }
        }
    }
}


