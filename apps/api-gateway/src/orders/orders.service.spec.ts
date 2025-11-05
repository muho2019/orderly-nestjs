import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError, type AxiosResponse } from 'axios';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let httpService: jest.Mocked<HttpService>;
  let configService: ConfigService;
  let service: OrdersService;

  beforeEach(() => {
    httpService = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn()
    } as unknown as jest.Mocked<HttpService>;

    configService = {
      get: jest.fn(() => undefined)
    } as unknown as ConfigService;

    service = new OrdersService(httpService, configService);
  });

  it('returns products when upstream succeeds', async () => {
    const products = [
      { id: 'p1', name: 'Sample', price: { amount: 1000, currency: 'KRW' } }
    ];

    const axiosResponse = {
      data: products,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {}
    } as AxiosResponse<typeof products>;

    httpService.get.mockReturnValue(of(axiosResponse));

    await expect(service.getProducts()).resolves.toEqual(products);
  });

  it('maps axios error responses to HttpException', async () => {
    const axiosError = new AxiosError('teapot');
    axiosError.response = {
      status: 418,
      statusText: "I'm a teapot",
      headers: {},
      config: {},
      data: { message: 'short and stout' }
    } as AxiosResponse;

    httpService.get.mockReturnValue(throwError(() => axiosError));

    await expect(service.getProducts()).rejects.toMatchObject({
      status: 418,
      response: { message: 'short and stout' }
    });
  });
});
