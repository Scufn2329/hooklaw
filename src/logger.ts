import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export function createLogger(name: string) {
  return pino({
    name,
    ...(!isProduction && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss',
        },
      },
    }),
  });
}
