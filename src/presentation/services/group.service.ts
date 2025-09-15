import { GroupModel } from "../../data";
import { CreateGroupDto, CustomError } from "../../domain";


export class GroupService {
    
    // DI
    constructor () {}

    async createGroup( createGroupDto: CreateGroupDto ) {

        const groupExists = await GroupModel.findOne({ name: createGroupDto.name });
        if ( groupExists ) throw CustomError.badRequest( 'Group already exists' );

        try {

            const group = new GroupModel({
                ...createGroupDto,
            });

            await group.save();

            return {
                id: group.id,
                name: group.name,
                description: group.description,
            }
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async getGroups() {

        try {

            const groups = await GroupModel.find();
            

            // const groupsEntity = GroupEntity.fromArray(groups);
            

            return {

                groups: groups

            }
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

}