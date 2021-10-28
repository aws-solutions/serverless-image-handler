export interface IConfig {
  port: number;
  region: string;
  isProd: boolean;
  srcBucket: string;
  styleTableName: string;
}

const conf: IConfig = {
  port: 8080,
  region: process.env.REGION ?? 'us-west-2',
  isProd: process.env.NODE_ENV === 'production',
  srcBucket: process.env.SRC_BUCKET || 'sih-input',
  styleTableName: process.env.STYLE_TABLE_NAME || 'style-table-name',
};

export default conf;