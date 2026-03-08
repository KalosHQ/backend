import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../auth/v1/guards/jwt-auth.guard';
import { VerifiedGuard } from '../../auth/v1/guards/verified.guard';
import {
  OnboardingStatusResponseDto,
  SetModelCustomizationDto,
} from './dto/onboarding.dto';
import { CurrentUser } from '../../auth/v1/decorators/current-user.decorator';

type AuthenticatedUser = { sub: string };

@ApiTags('Users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('onboarding/model-customization')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Submit styles + model customization and trigger Generate Model flow',
  })
  @ApiBody({ type: SetModelCustomizationDto })
  @ApiResponse({
    status: 201,
    description:
      'Model customization saved successfully. Includes presigned photo URL for private bucket images.',
    type: OnboardingStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid onboarding payload or photo upload requirements not met',
  })
  setModelCustomization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SetModelCustomizationDto,
  ) {
    return this.usersService.setModelCustomization(user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('onboarding/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current onboarding state' })
  @ApiResponse({
    status: 200,
    description:
      'Current onboarding state, with presigned URLs for private bucket media fields.',
    type: OnboardingStatusResponseDto,
  })
  getOnboardingStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getOnboardingStatus(user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard, VerifiedGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User not verified' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, VerifiedGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user details' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User not verified' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
