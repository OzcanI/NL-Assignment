import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

export function validateDto(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Request body'yi DTO class'ına dönüştür
      const dtoObject = plainToClass(dtoClass, req.body);
      
      // Validation yap
      const errors = await validate(dtoObject as object, {
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true
      });

      if (errors.length > 0) {
        // Validation hatalarını formatla
        const formattedErrors = formatValidationErrors(errors);
        
        res.status(400).json({
          success: false,
          message: 'Validation hatası',
          errors: formattedErrors
        });
        return;
      }

      // Validated data'yı request'e ekle
      req.body = dtoObject;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Validation middleware hatası',
        error: error
      });
      return;
    }
  };
}

export function validateQuery(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Request query'yi DTO class'ına dönüştür
      const dtoObject = plainToClass(dtoClass, req.query);
      
      // Validation yap
      const errors = await validate(dtoObject as object, {
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true
      });

      if (errors.length > 0) {
        // Validation hatalarını formatla
        const formattedErrors = formatValidationErrors(errors);
        
        res.status(400).json({
          success: false,
          message: 'Query validation hatası',
          errors: formattedErrors
        });
        return;
      }

      // Validated data'yı request'e ekle
      req.query = dtoObject as any;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Query validation middleware hatası',
        error: error
      });
      return;
    }
  };
}

export function validateParams(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Request params'ı DTO class'ına dönüştür
      const dtoObject = plainToClass(dtoClass, req.params);
      
      // Validation yap
      const errors = await validate(dtoObject as object, {
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true
      });

      if (errors.length > 0) {
        // Validation hatalarını formatla
        const formattedErrors = formatValidationErrors(errors);
        
        res.status(400).json({
          success: false,
          message: 'Params validation hatası',
          errors: formattedErrors
        });
        return;
      }

      // Validated data'yı request'e ekle
      req.params = dtoObject as any;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Params validation middleware hatası',
        error: error
      });
      return;
    }
  };
}

// Validation hatalarını formatla
function formatValidationErrors(errors: ValidationError[]): any[] {
  return errors.map(error => {
    const constraints = error.constraints;
    const messages = constraints ? Object.values(constraints) : [];
    
    return {
      field: error.property,
      messages: messages,
      value: error.value
    };
  });
} 