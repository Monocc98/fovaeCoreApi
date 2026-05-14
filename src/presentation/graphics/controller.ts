import { Request, Response } from "express";
import { sendErrorResponse, sendUnauthorizedError, sendValidationError } from "../errors/http-error-response";
import { CustomError } from "../../domain";
import { GraphicsService } from "../services/graphics.service";

export class GraphicsController {
  constructor(private readonly graphicsService: GraphicsService) {}

  private handleError = (error: unknown, res: Response) => sendErrorResponse(res, error);

  getExpenseBudgetTreeByMonth = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) {
      return sendUnauthorizedError(res, "User not authenticated");
    }
    const { idCompany } = req.params;

    await this.graphicsService
      .getExpenseBudgetTreeByMonth(user.id, idCompany)
      .then((overview) => res.json(overview))
      .catch((error) => this.handleError(error, res));
  };
}


