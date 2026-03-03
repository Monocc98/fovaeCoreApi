import { Request, Response } from "express";
import {
    CreateAdminUserDto,
    CustomError,
    ListAdminUsersDto,
    UpdateAdminUserDto,
    UpdateAdminUserPermissionsDto,
} from "../../domain";
import { AdminUsersService } from "../services/adminUsers.service";

export class AdminUsersController {

    constructor(
        private readonly adminUsersService: AdminUsersService,
    ) {}

    private handleError = ( error: unknown, res: Response ) => {
        if ( error instanceof CustomError ) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.log(`${ error }`);
        return res.status(500).json({ error: 'Internal server error '});
    }

    listUsers = async(req: Request, res: Response) => {
        const [ error, dto ] = ListAdminUsersDto.create(req.query as any);
        if ( error ) return res.status(400).json({ error });

        this.adminUsersService.listUsers(dto!)
            .then( result => res.json(result) )
            .catch( error => this.handleError(error, res) );
    }

    getUserById = async(req: Request, res: Response) => {
        const userId = req.params.id;

        this.adminUsersService.getUserById(userId)
            .then( result => res.json(result) )
            .catch( error => this.handleError(error, res) );
    }

    createUser = async(req: Request, res: Response) => {
        const [ error, dto ] = CreateAdminUserDto.create(req.body);
        if ( error ) return res.status(400).json({ error });

        this.adminUsersService.createUser(dto!)
            .then( result => res.status(201).json(result) )
            .catch( error => this.handleError(error, res) );
    }

    updateUser = async(req: Request, res: Response) => {
        const [ error, dto ] = UpdateAdminUserDto.create(req.body);
        if ( error ) return res.status(400).json({ error });

        this.adminUsersService.updateUser(req.params.id, dto!)
            .then( result => res.json(result) )
            .catch( error => this.handleError(error, res) );
    }

    deactivateUser = async(req: Request, res: Response) => {
        this.adminUsersService.deactivateUser(req.params.id)
            .then( result => res.json(result) )
            .catch( error => this.handleError(error, res) );
    }

    getUserPermissions = async(req: Request, res: Response) => {
        this.adminUsersService.getUserPermissions(req.params.id)
            .then( result => res.json(result) )
            .catch( error => this.handleError(error, res) );
    }

    updateUserPermissions = async(req: Request, res: Response) => {
        const [ error, dto ] = UpdateAdminUserPermissionsDto.create(req.body);
        if ( error ) return res.status(400).json({ error });

        this.adminUsersService.updateUserPermissions(req.params.id, dto!)
            .then( result => res.json(result) )
            .catch( error => this.handleError(error, res) );
    }
}
