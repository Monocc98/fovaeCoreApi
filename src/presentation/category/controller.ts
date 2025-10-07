import { Response, Request } from "express";
import { CreateCategoryDto, CustomError, UpdateCategoryDto } from "../../domain";
import { CategoryService } from "../services/category.service";
import { CreateSubcategoryDto, UpdateSubcategoryDto } from "../../domain/dtos/category/subcategory.dto";
import { CreateSubsubcategoryDto, UpdateSubsubcategoryDto } from "../../domain/dtos/category/subsubcategory.dto";



export class CategoryController {

    // DI
    constructor (
        private readonly categoryService: CategoryService,
    ) {}

    private handleError = ( error: unknown, res: Response ) => {
        if ( error instanceof CustomError) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        
        return res.status(500).json({ error: 'Internal server error '});
    }

    createCategory = async(req: Request, res: Response) => {

        const [ error, createCategoryDto ] = CreateCategoryDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

        this.categoryService.createCategory( createCategoryDto! )
            .then( category => res.status(201).json( category ) )
            .catch( error => this.handleError( error, res ) );

    }

    createSubcategory = async(req: Request, res: Response) => {

        const [ error, createSubcategoryDto ] = CreateSubcategoryDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

        this.categoryService.createSubcategory( createSubcategoryDto! )
            .then( category => res.status(201).json( category ) )
            .catch( error => this.handleError( error, res ) );

    }

    createSubsubcategory = async(req: Request, res: Response) => {

        const [ error, createSubsubategoryDto ] = CreateSubsubcategoryDto.create(req.body);
        if ( error ) return res.status(400).json({ error })

        this.categoryService.createSubsubcategory( createSubsubategoryDto! )
            .then( category => res.status(201).json( category ) )
            .catch( error => this.handleError( error, res ) );

    }

    getCategories = async(req: Request, res: Response) => {


        this.categoryService.getCategories()
            .then ( companies => res.json( companies ))
            .catch( error => this.handleError( error, res ) );
        
    }

    getCategoriesOverview = async(req: Request, res: Response) => {

        const idCompany = req.params.idCompany;

        this.categoryService.getCategoriesOverview(idCompany)
            .then ( companies => res.json( companies ))
            .catch( error => this.handleError( error, res ) );
        
    }

    updateCategory = async(req: Request, res: Response) => {

        const [ error, updateCategoryDto ] = UpdateCategoryDto.create(req.body);
        const idCategory = req.params.idCategory;

        this.categoryService.updateCategory(idCategory, updateCategoryDto!)
            .then ( category => res.json( category ))
            .catch( error => this.handleError( error, res ) );

    }

    updateSubcategory = async(req: Request, res: Response) => {

        const [ error, updateSubcategoryDto ] = UpdateSubcategoryDto.create(req.body);
        const idSubcategory = req.params.idSubcategory;

        this.categoryService.updateSubcategory(idSubcategory, updateSubcategoryDto!)
            .then ( subcategory => res.json( subcategory ))
            .catch( error => this.handleError( error, res ) );

    }

    updateSubsubcategory = async(req: Request, res: Response) => {

        const [ error, updateSubsubcategoryDto ] = UpdateSubsubcategoryDto.create(req.body);
        const idSubsubategory = req.params.idSubsubcategory;

        this.categoryService.updateSubsubcategory(idSubsubategory, updateSubsubcategoryDto!)
            .then ( subsubategory => res.json( subsubategory ))
            .catch( error => this.handleError( error, res ) );

    }

    deleteCategory = async(req: Request, res: Response) => {

        const idCategory = req.params.idCategory;


        this.categoryService.deleteCategory( idCategory )
            .then( category => res.status(201).json( category ) )
            .catch( error => this.handleError( error, res ) );

    }

    deleteSubcategory = async(req: Request, res: Response) => {

        const idSubcategory = req.params.idSubcategory;


        this.categoryService.deleteSubcategory( idSubcategory )
            .then( subcategory => res.status(201).json( subcategory ) )
            .catch( error => this.handleError( error, res ) );

    }

    deleteSubsubcategory = async(req: Request, res: Response) => {

        const idSubsubcategory = req.params.idSubsubcategory;


        this.categoryService.deleteSubsubcategory( idSubsubcategory )
            .then( subsubcategory => res.status(201).json( subsubcategory ) )
            .catch( error => this.handleError( error, res ) );

    }
}
