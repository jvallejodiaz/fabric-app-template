import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { AppService } from './app.service';

class Value {
  value: string;
}

@Controller('names')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(':name')
  async getName(@Param('name') name: string): Promise<string> {
    return await this.appService.getName(name);
  }
  @Put(':name')
  async putName(
    @Param('name') name: string,
    @Body() value: Value,
  ): Promise<string> {
    return await this.appService.putName(name, value.value);
  }
}
