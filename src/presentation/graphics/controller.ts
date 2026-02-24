import { Request, Response } from "express";
import { CustomError } from "../../domain";
import { GraphicsService } from "../services/graphics.service";

export class GraphicsController {
  constructor(private readonly graphicsService: GraphicsService) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.log(`${error}`);
    return res.status(500).json({ error: "Internal server error " });
  };

  getExpenseBudgetTreeByMonth = async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const { idCompany } = req.params;

    await this.graphicsService
      .getExpenseBudgetTreeByMonth(user.id, idCompany)
      .then((overview) => res.json(overview))
      .catch((error) => this.handleError(error, res));
  };
}
