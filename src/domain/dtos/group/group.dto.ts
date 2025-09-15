
export class CreateGroupDto {

    private constructor(
        public name: string,
        public description?: string,
    ) {}

    static create( object: { [key:string]: any }): [string?, CreateGroupDto?] {
        const { name, description } = object;

        if (!name ) return ['Missing name'];
        if (typeof name !== 'string') return ['Invalid name type'];
        if (name.trim().length < 3) return ['Name too short'];

        // description opcional
        if (description !== undefined && typeof description !== 'string') {
            return ['Invalid description type'];
        }

        return [undefined, new CreateGroupDto(name, description)];
    }
}