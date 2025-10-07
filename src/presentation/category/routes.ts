import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { CategoryService } from '../services/category.service';
import { CategoryController } from './controller';




export class CategoriesRoutes {


  static get routes(): Router {

    const router = Router();
    const categoryService = new CategoryService();
    const controller = new CategoryController( categoryService );
    
    // Definir las rutas
    router.get('/', controller.getCategories);
    router.get('/:idCompany', controller.getCategoriesOverview);

    router.post('/', controller.createCategory); //, [ AuthMiddleware.validateJWT ]
    router.post('/subcategories', controller.createSubcategory); //, [ AuthMiddleware.validateJWT ]
    router.post('/subsubcategories', controller.createSubsubcategory); //, [ AuthMiddleware.validateJWT ]

    router.put('/:idCategory', controller.updateCategory);
    router.put('/subcategories/:idSubcategory', controller.updateSubcategory);
    router.put('/subsubcategories/:idSubsubcategory', controller.updateSubsubcategory);

    router.delete('/:idCategory', controller.deleteCategory);
    router.delete('/subcategories/:idSubcategory', controller.deleteSubcategory);
    router.delete('/subsubcategories/:idSubsubcategory', controller.deleteSubsubcategory);

    



    return router;
  }


}

