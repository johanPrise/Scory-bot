import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { env } from '../../runtime-env';

@Injectable()
export class SlowRequestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; originalUrl?: string; url: string }>();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration >= env.SLOW_REQUEST_MS) {
          console.warn(`[slow-request] ${request.method} ${request.originalUrl || request.url} ${duration}ms`);
        }
      }),
    );
  }
}
