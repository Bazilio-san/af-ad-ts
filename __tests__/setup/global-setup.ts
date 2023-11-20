import * as dotenv from 'dotenv';

dotenv.config();

const setup = async () => {
  process.env.NODE_ENV = 'test';
  process.env.SUPPRESS_NO_CONFIG_WARNING = 'true';
};

export default setup;
