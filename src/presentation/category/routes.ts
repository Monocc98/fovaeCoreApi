import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { CategoryService } from '../services/category.service';
import { CategoryController } from './controller';




export class CategoriesRoutes {


  static get routes(): Router {

    const router = Router();
    const categoryService = new CategoryService();
    const controller = new CategoryController( categoryService );
    router.use(AuthMiddleware.validateJWT);
    
    // Definir las rutas
    router.get('/', controller.getCategories);
    router.get('/:idCompany', controller.getCategoriesOverview);

    router.post('/', controller.createCategory);
    router.post('/subcategories', controller.createSubcategory);
    router.post('/subsubcategories', controller.createSubsubcategory);

    router.put('/:idCategory', controller.updateCategory);
    router.put('/subcategories/:idSubcategory', controller.updateSubcategory);
    router.put('/subsubcategories/:idSubsubcategory', controller.updateSubsubcategory);

    router.delete('/:idCategory', controller.deleteCategory);
    router.delete('/subcategories/:idSubcategory', controller.deleteSubcategory);
    router.delete('/subsubcategories/:idSubsubcategory', controller.deleteSubsubcategory);

    



    return router;
  }


}

