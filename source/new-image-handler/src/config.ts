export interface IConfig {
  port: number;
  region: string;
  isProd: boolean;
  srcBucket: string;
  styleTableName: string;
  useStyleConfig: boolean;
}

const conf: IConfig = {
  port: 8080,
  region: process.env.REGION ?? 'us-west-2',
  isProd: process.env.NODE_ENV === 'production',
  srcBucket: process.env.BUCKET || process.env.SRC_BUCKET || 'sih-input',
  styleTableName: process.env.STYLE_TABLE_NAME || 'style-table-name',
  useStyleConfig: !!process.env.USE_STYLE_CONFIG
};

export default conf;