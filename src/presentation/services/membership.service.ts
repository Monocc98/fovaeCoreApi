

import { MembershipModel } from "../../data";
import { CreateMembershipDto, CustomError } from "../../domain";


export class MembershipService {
    
    // DI
    constructor () {}

    async createMembership( createMembershipDto: CreateMembershipDto ) {

        const membershipExists = await MembershipModel.findOne({ user: createMembershipDto.user, company: createMembershipDto.company });
        if ( membershipExists ) throw CustomError.badRequest( 'Membership already exists' );

        try {

            const membership = new MembershipModel({
                ...createMembershipDto,
            });

            await membership.save();

            return {
                membership
            };
            
        } catch (error) {
            throw CustomError.internalServer(`${ error }`);
        }

    } 

    async getMemberships() {

        try {

            const memberships = await MembershipModel.find()
                .populate('company')
                .populate('user', 'id name email')

            return {
                memberships
            };
            
        } catch (error) {
            console.log(error);
            
            throw CustomError.internalServer('Internal Server Error');
        }

    }

}