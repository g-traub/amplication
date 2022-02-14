import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { camelCase } from 'camel-case';
import { pick, omit } from 'lodash';
import cuid from 'cuid';
import {
  createEntityNamesWhereInput,
  DELETE_ONE_USER_ENTITY_ERROR_MESSAGE,
  EntityPendingChange,
  EntityService,
  NAME_VALIDATION_ERROR_MESSAGE
} from './entity.service';
import { PrismaService } from 'nestjs-prisma';
import {
  Entity,
  EntityVersion,
  EntityField,
  User,
  Commit,
  EntityPermission,
  EntityPermissionField,
  EntityPermissionRole,
  AppRole
} from 'src/models';
import { EnumDataType } from 'src/enums/EnumDataType';
import { EnumEntityAction } from 'src/enums/EnumEntityAction';
import { EnumEntityPermissionType } from 'src/enums/EnumEntityPermissionType';
import { FindManyEntityArgs } from './dto';
import {
  CURRENT_VERSION_NUMBER,
  DEFAULT_ENTITIES,
  DEFAULT_PERMISSIONS,
  USER_ENTITY_NAME
} from './constants';
import { JsonSchemaValidationModule } from 'src/services/jsonSchemaValidation.module';
import { DiffModule } from 'src/services/diff.module';
import { prepareDeletedItemName } from 'src/util/softDelete';
import {
  EnumPendingChangeAction,
  EnumPendingChangeResourceType
} from '../app/dto';
import { DiffService } from 'src/services/diff.service';

const EXAMPLE_CUID = 'EXAMPLE_CUID';
const EXAMPLE_APP_ID = 'exampleAppId';
const EXAMPLE_ENTITY_ID = 'exampleEntityId';
const EXAMPLE_CURRENT_ENTITY_VERSION_ID = 'currentEntityVersionId';
const EXAMPLE_LAST_ENTITY_VERSION_ID = 'lastEntityVersionId';
const EXAMPLE_LAST_ENTITY_VERSION_NUMBER = 4;

const EXAMPLE_ACTION = EnumEntityAction.View;
const EXAMPLE_ROLE = EnumEntityPermissionType.AllRoles;

const EXAMPLE_COMMIT_ID = 'exampleCommitId';
const EXAMPLE_USER_ID = 'exampleUserId';
const EXAMPLE_MESSAGE = 'exampleMessage';

const EXAMPLE_ENTITY_FIELD_NAME = 'exampleFieldName';
const EXAMPLE_NON_EXISTING_ENTITY_FIELD_NAME = 'nonExistingFieldName';

const EXAMPLE_COMMIT: Commit = {
  id: EXAMPLE_COMMIT_ID,
  createdAt: new Date(),
  userId: EXAMPLE_USER_ID,
  message: EXAMPLE_MESSAGE
};

const EXAMPLE_ENTITY: Entity = {
  id: EXAMPLE_ENTITY_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  appId: 'exampleApp',
  name: 'exampleEntity',
  displayName: 'example entity',
  pluralDisplayName: 'exampleEntities',
  description: 'example entity',
  lockedByUserId: undefined,
  lockedAt: null
};

const EXAMPLE_LOCKED_ENTITY: Entity = {
  ...EXAMPLE_ENTITY,
  lockedByUserId: EXAMPLE_USER_ID,
  lockedAt: new Date()
};

const EXAMPLE_USER_ENTITY: Entity = {
  ...EXAMPLE_ENTITY,
  name: USER_ENTITY_NAME
};

const EXAMPLE_ENTITY_FIELD: EntityField = {
  id: 'exampleEntityField',
  permanentId: 'exampleEntityFieldPermanentId',
  createdAt: new Date(),
  updatedAt: new Date(),
  entityVersionId: 'exampleEntityVersion',
  name: EXAMPLE_ENTITY_FIELD_NAME,
  displayName: 'example field',
  dataType: EnumDataType.SingleLineText,
  properties: null,
  required: true,
  unique: false,
  searchable: true,
  description: 'example field'
};

const EXAMPLE_CURRENT_ENTITY_VERSION: EntityVersion = {
  id: EXAMPLE_CURRENT_ENTITY_VERSION_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  entityId: 'exampleEntity',
  versionNumber: CURRENT_VERSION_NUMBER,
  commitId: null,
  name: 'exampleEntity',
  displayName: 'example entity',
  pluralDisplayName: 'exampleEntities',
  description: 'example entity'
};

const EXAMPLE_ENTITY_PENDING_CHANGE_CREATE: EntityPendingChange = {
  resourceId: EXAMPLE_ENTITY.id,
  action: EnumPendingChangeAction.Create,
  resourceType: EnumPendingChangeResourceType.Entity,
  versionNumber: 1,
  resource: EXAMPLE_ENTITY
};
const EXAMPLE_DELETED_ENTITY = {
  ...EXAMPLE_ENTITY,
  versions: [{ ...EXAMPLE_CURRENT_ENTITY_VERSION, deleted: true }],
  deletedAt: new Date()
};
const EXAMPLE_ENTITY_PENDING_CHANGE_DELETE: EntityPendingChange = {
  resourceId: EXAMPLE_ENTITY.id,
  action: EnumPendingChangeAction.Delete,
  resourceType: EnumPendingChangeResourceType.Entity,
  versionNumber: 1,
  resource: { ...EXAMPLE_DELETED_ENTITY, versions: undefined }
};
const EXAMPLE_ENTITY_PENDING_CHANGE_UPDATE: EntityPendingChange = {
  resourceId: EXAMPLE_ENTITY.id,
  action: EnumPendingChangeAction.Update,
  resourceType: EnumPendingChangeResourceType.Entity,
  versionNumber: 1,
  resource: EXAMPLE_ENTITY
};

const EXAMPLE_LAST_ENTITY_VERSION: EntityVersion = {
  id: EXAMPLE_LAST_ENTITY_VERSION_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  entityId: 'exampleEntity',
  versionNumber: EXAMPLE_LAST_ENTITY_VERSION_NUMBER,
  commitId: EXAMPLE_COMMIT_ID,
  name: 'exampleEntity',
  displayName: 'example entity',
  pluralDisplayName: 'exampleEntities',
  description: 'example entity'
};

const EXAMPLE_APP_ROLE: AppRole = {
  id: 'exampleAppRoleId',
  createdAt: new Date(),
  updatedAt: new Date(),
  name: 'exampleAppRole',
  displayName: 'example app role'
};

const EXAMPLE_ENTITY_PERMISSION: EntityPermission = {
  id: 'examplePermissionId',
  entityVersionId: EXAMPLE_CURRENT_ENTITY_VERSION_ID,
  action: EXAMPLE_ACTION,
  type: EXAMPLE_ROLE
};

const EXAMPLE_ENTITY_PERMISSION_FIELD: EntityPermissionField = {
  id: 'examplePermissionFieldId',
  permissionId: EXAMPLE_ENTITY_PERMISSION.id,
  fieldPermanentId: EXAMPLE_ENTITY_FIELD.permanentId,
  entityVersionId: EXAMPLE_LAST_ENTITY_VERSION_ID,
  field: EXAMPLE_ENTITY_FIELD
};

const EXAMPLE_ENTITY_PERMISSION_FIELD_WITH_PERMISSION_AND_ENTITY_VERSION = {
  ...EXAMPLE_ENTITY_PERMISSION_FIELD,
  entityVersionId: EXAMPLE_CURRENT_ENTITY_VERSION_ID,
  permission: {
    ...EXAMPLE_ENTITY_PERMISSION,
    entityVersion: EXAMPLE_CURRENT_ENTITY_VERSION
  }
};

const EXAMPLE_ENTITY_PERMISSION_ROLE: EntityPermissionRole = {
  id: 'exampleEntityPermissionRoleId',
  entityVersionId: EXAMPLE_CURRENT_ENTITY_VERSION_ID,
  action: EXAMPLE_ACTION,
  appRoleId: 'exampleAppRoleId',
  appRole: EXAMPLE_APP_ROLE
};

const EXAMPLE_ENTITY_FIELD_DATA = {
  name: 'exampleEntityFieldName',
  displayName: 'Example Entity Field Display Name',
  required: false,
  unique: false,
  searchable: false,
  description: '',
  dataType: EnumDataType.SingleLineText,
  properties: {
    maxLength: 42
  }
};

const EXAMPLE_ENTITY_FIELD_DATA_WITH_NESTED_QUERY = {
  ...EXAMPLE_ENTITY_FIELD_DATA,
  entityVersion: {
    connect: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      entityId_versionNumber: {
        entityId: EXAMPLE_ENTITY_ID,
        versionNumber: CURRENT_VERSION_NUMBER
      }
    }
  }
};

const EXAMPLE_USER: User = {
  id: EXAMPLE_USER_ID,
  createdAt: new Date(),
  updatedAt: new Date()
};

const EXAMPLE_ENTITY_WHERE_PARENT_ID = { connect: { id: 'EXAMPLE_ID' } };

const EXAMPLE_ENTITY_PERMISSION_WITH_ROLES_AND_FIELDS: EntityPermission = {
  ...EXAMPLE_ENTITY_PERMISSION,
  permissionRoles: [
    {
      ...EXAMPLE_ENTITY_PERMISSION_ROLE,
      appRole: EXAMPLE_APP_ROLE
    }
  ],
  permissionFields: [
    {
      ...EXAMPLE_ENTITY_PERMISSION_FIELD,
      permissionRoles: [
        {
          ...EXAMPLE_ENTITY_PERMISSION_ROLE,
          appRole: EXAMPLE_APP_ROLE
        }
      ]
    }
  ]
};

const prismaEntityFindFirstMock = jest.fn(() => {
  return EXAMPLE_ENTITY;
});

const prismaEntityFindManyMock = jest.fn(() => {
  return [EXAMPLE_ENTITY];
});

const prismaEntityCreateMock = jest.fn(() => {
  return EXAMPLE_ENTITY;
});

const prismaEntityDeleteMock = jest.fn(() => {
  return EXAMPLE_ENTITY;
});

const prismaEntityUpdateMock = jest.fn(() => {
  return EXAMPLE_ENTITY;
});

const prismaEntityVersionFindOneMock = jest.fn(
  (args: Prisma.EntityVersionFindUniqueArgs) => {
    const entityVersionList = [
      EXAMPLE_CURRENT_ENTITY_VERSION,
      EXAMPLE_LAST_ENTITY_VERSION
    ];

    const version = entityVersionList.find(item => item.id == args.where.id);

    if (args.include?.fields) {
      version.fields = [
        {
          ...EXAMPLE_ENTITY_FIELD,
          entityVersionId: version.id
        }
      ];
    }

    if (args.include?.permissions) {
      version.permissions = [];
    }

    return {
      then: resolve => resolve(version),
      commit: () => EXAMPLE_COMMIT
    };
  }
);

const prismaEntityVersionFindManyMock = jest.fn(
  (args: Prisma.EntityVersionFindUniqueArgs) => {
    if (args.include?.entity) {
      return [
        { ...EXAMPLE_CURRENT_ENTITY_VERSION, entity: EXAMPLE_LOCKED_ENTITY },
        { ...EXAMPLE_LAST_ENTITY_VERSION, entity: EXAMPLE_LOCKED_ENTITY }
      ];
    } else {
      return [EXAMPLE_CURRENT_ENTITY_VERSION, EXAMPLE_LAST_ENTITY_VERSION];
    }
  }
);

const prismaEntityVersionCreateMock = jest.fn(
  (args: Prisma.EntityVersionCreateArgs) => {
    return {
      ...EXAMPLE_LAST_ENTITY_VERSION,
      versionNumber: args.data.versionNumber
    };
  }
);
const prismaEntityVersionUpdateMock = jest.fn(() => {
  return EXAMPLE_CURRENT_ENTITY_VERSION;
});

const prismaEntityFieldFindManyMock = jest.fn(() => {
  return [EXAMPLE_ENTITY_FIELD];
});

const prismaEntityFieldFindFirstMock = jest.fn(
  (args: Prisma.EntityFieldFindUniqueArgs) => {
    if (args?.include?.entityVersion) {
      return {
        ...EXAMPLE_ENTITY_FIELD,
        entityVersion: EXAMPLE_CURRENT_ENTITY_VERSION
      };
    }
    return EXAMPLE_ENTITY_FIELD;
  }
);
const prismaEntityFieldCreateMock = jest.fn(() => EXAMPLE_ENTITY_FIELD);
const prismaEntityFieldUpdateMock = jest.fn(() => EXAMPLE_ENTITY_FIELD);

const prismaEntityPermissionFindManyMock = jest.fn(() => [
  EXAMPLE_ENTITY_PERMISSION,
  EXAMPLE_ENTITY_PERMISSION
]);
const prismaEntityPermissionFieldDeleteManyMock = jest.fn(() => null);
const prismaEntityPermissionFieldFindManyMock = jest.fn(() => null);
const prismaEntityPermissionFieldCreateMock = jest.fn(
  () => EXAMPLE_ENTITY_PERMISSION_FIELD
);
const prismaEntityPermissionFieldFindUniqueMock = jest.fn(() => null);
const prismaEntityPermissionFieldUpdateMock = jest.fn(() => null);
const prismaEntityPermissionRoleDeleteManyMock = jest.fn(() => null);

const areDifferentMock = jest.fn(() => true);

jest.mock('cuid');
// eslint-disable-next-line
// @ts-ignore
cuid.mockImplementation(() => EXAMPLE_CUID);

describe('EntityService', () => {
  let service: EntityService;

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaEntityFindManyMock.mockImplementation(() => [EXAMPLE_ENTITY]);

    const module: TestingModule = await Test.createTestingModule({
      imports: [JsonSchemaValidationModule, DiffModule],
      providers: [
        {
          provide: PrismaService,
          useClass: jest.fn(() => ({
            entity: {
              findFirst: prismaEntityFindFirstMock,
              findMany: prismaEntityFindManyMock,
              create: prismaEntityCreateMock,
              delete: prismaEntityDeleteMock,
              update: prismaEntityUpdateMock
            },
            entityVersion: {
              findMany: prismaEntityVersionFindManyMock,
              create: prismaEntityVersionCreateMock,
              update: prismaEntityVersionUpdateMock,
              findUnique: prismaEntityVersionFindOneMock
            },
            entityField: {
              findFirst: prismaEntityFieldFindFirstMock,
              create: prismaEntityFieldCreateMock,
              update: prismaEntityFieldUpdateMock,
              findMany: prismaEntityFieldFindManyMock
            },
            entityPermission: {
              findMany: prismaEntityPermissionFindManyMock
            },
            entityPermissionField: {
              deleteMany: prismaEntityPermissionFieldDeleteManyMock,
              findMany: prismaEntityPermissionFieldFindManyMock,
              create: prismaEntityPermissionFieldCreateMock,
              findUnique: prismaEntityPermissionFieldFindUniqueMock,
              update: prismaEntityPermissionFieldUpdateMock
            },
            entityPermissionRole: {
              deleteMany: prismaEntityPermissionRoleDeleteManyMock
            }
          }))
        },
        EntityService
      ]
    })
      .overrideProvider(DiffService)
      .useValue({ areDifferent: areDifferentMock })
      .compile();

    service = module.get<EntityService>(EntityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  test.each([
    [EXAMPLE_NON_EXISTING_ENTITY_FIELD_NAME, [EXAMPLE_ENTITY_FIELD_NAME], []],
    [
      EXAMPLE_NON_EXISTING_ENTITY_FIELD_NAME,
      [EXAMPLE_NON_EXISTING_ENTITY_FIELD_NAME],
      [EXAMPLE_NON_EXISTING_ENTITY_FIELD_NAME]
    ],
    [
      EXAMPLE_NON_EXISTING_ENTITY_FIELD_NAME,
      [EXAMPLE_ENTITY_FIELD_NAME, EXAMPLE_NON_EXISTING_ENTITY_FIELD_NAME],
      [EXAMPLE_NON_EXISTING_ENTITY_FIELD_NAME]
    ]
  ])(
    '.validateAllFieldsExist(%v, %v)',
    async (entityId, fieldNames, expected) => {
      expect(
        await service.validateAllFieldsExist(entityId, fieldNames)
      ).toEqual(new Set(expected));
    }
  );

  it('should find one entity', async () => {
    const args = {
      where: {
        id: EXAMPLE_ENTITY_ID
      },
      version: EXAMPLE_CURRENT_ENTITY_VERSION.versionNumber
    };
    expect(await service.entity(args)).toEqual(EXAMPLE_ENTITY);
    expect(prismaEntityFindFirstMock).toBeCalledTimes(1);
    expect(prismaEntityFindFirstMock).toBeCalledWith({
      where: {
        id: args.where.id,
        deletedAt: null
      }
    });
  });

  it('should find many entities', async () => {
    const args: FindManyEntityArgs = {};
    expect(await service.entities(args)).toEqual([EXAMPLE_ENTITY]);
    expect(prismaEntityFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityFindManyMock).toBeCalledWith({
      ...args,
      where: {
        ...args.where,
        deletedAt: null
      }
    });
  });

  it('should create one entity', async () => {
    const createArgs = {
      args: {
        data: {
          name: EXAMPLE_ENTITY.name,
          displayName: EXAMPLE_ENTITY.displayName,
          description: EXAMPLE_ENTITY.description,
          pluralDisplayName: EXAMPLE_ENTITY.pluralDisplayName,
          app: { connect: { id: EXAMPLE_ENTITY.appId } }
        }
      },
      user: EXAMPLE_USER
    };
    const newEntityArgs = {
      data: {
        ...createArgs.args.data,
        lockedAt: expect.any(Date),
        lockedByUser: {
          connect: {
            id: createArgs.user.id
          }
        },
        versions: {
          create: {
            commit: undefined,
            versionNumber: CURRENT_VERSION_NUMBER,
            name: createArgs.args.data.name,
            displayName: createArgs.args.data.displayName,
            pluralDisplayName: createArgs.args.data.pluralDisplayName,
            description: createArgs.args.data.description,
            permissions: {
              create: DEFAULT_PERMISSIONS
            }
          }
        }
      }
    };

    expect(
      await service.createOneEntity(createArgs.args, createArgs.user)
    ).toEqual(EXAMPLE_ENTITY);
    expect(prismaEntityCreateMock).toBeCalledTimes(1);
    expect(prismaEntityCreateMock).toBeCalledWith(newEntityArgs);
    expect(prismaEntityFieldCreateMock).toBeCalledTimes(3);
  });

  it('should delete one entity', async () => {
    const deleteArgs = {
      args: {
        where: { id: EXAMPLE_ENTITY_ID }
      },
      user: EXAMPLE_USER
    };

    const updateArgs = {
      where: deleteArgs.args.where,
      data: {
        name: prepareDeletedItemName(EXAMPLE_ENTITY.name, EXAMPLE_ENTITY.id),
        displayName: prepareDeletedItemName(
          EXAMPLE_ENTITY.displayName,
          EXAMPLE_ENTITY.id
        ),
        pluralDisplayName: prepareDeletedItemName(
          EXAMPLE_ENTITY.pluralDisplayName,
          EXAMPLE_ENTITY.id
        ),
        deletedAt: expect.any(Date),
        versions: {
          update: {
            where: {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              entityId_versionNumber: {
                entityId: deleteArgs.args.where.id,
                versionNumber: CURRENT_VERSION_NUMBER
              }
            },
            data: {
              deleted: true
            }
          }
        }
      }
    };
    expect(
      await service.deleteOneEntity(deleteArgs.args, deleteArgs.user)
    ).toEqual(EXAMPLE_ENTITY);

    expect(prismaEntityFindFirstMock).toBeCalledTimes(1);
    expect(prismaEntityFindFirstMock).toBeCalledWith({
      where: {
        id: EXAMPLE_ENTITY_ID,
        deletedAt: null
      }
    });

    expect(prismaEntityUpdateMock).toBeCalledTimes(2);
    expect(prismaEntityUpdateMock).toBeCalledWith(updateArgs);
  });

  it('should throw an exception when trying to delete user entity', async () => {
    const deleteArgs = {
      args: {
        where: { id: EXAMPLE_ENTITY_ID }
      },
      user: EXAMPLE_USER
    };

    prismaEntityUpdateMock.mockImplementationOnce(() => EXAMPLE_USER_ENTITY);

    await expect(
      service.deleteOneEntity(deleteArgs.args, deleteArgs.user)
    ).rejects.toThrow(DELETE_ONE_USER_ENTITY_ERROR_MESSAGE);

    expect(prismaEntityFindFirstMock).toBeCalledTimes(1);
    expect(prismaEntityFindFirstMock).toBeCalledWith({
      where: {
        id: EXAMPLE_ENTITY_ID,
        deletedAt: null
      }
    });

    expect(prismaEntityUpdateMock).toBeCalledTimes(1);
  });

  it('should update one entity', async () => {
    const updateArgs = {
      args: {
        where: { id: EXAMPLE_ENTITY_ID },
        data: {
          name: EXAMPLE_ENTITY.name,
          displayName: EXAMPLE_ENTITY.displayName,
          pluralDisplayName: EXAMPLE_ENTITY.pluralDisplayName,
          description: EXAMPLE_ENTITY.description
        }
      },
      user: EXAMPLE_USER
    };

    expect(
      await service.updateOneEntity(updateArgs.args, updateArgs.user)
    ).toEqual(EXAMPLE_ENTITY);
    expect(prismaEntityUpdateMock).toBeCalledTimes(2);
    expect(prismaEntityUpdateMock).toBeCalledWith({
      where: { ...updateArgs.args.where },
      data: {
        ...updateArgs.args.data,
        versions: {
          update: {
            where: {
              // eslint-disable-next-line  @typescript-eslint/naming-convention
              entityId_versionNumber: {
                entityId: updateArgs.args.where.id,
                versionNumber: CURRENT_VERSION_NUMBER
              }
            },
            data: {
              name: updateArgs.args.data.name,
              displayName: updateArgs.args.data.displayName,
              pluralDisplayName: updateArgs.args.data.pluralDisplayName,
              description: updateArgs.args.data.description
            }
          }
        }
      }
    });
  });

  it('should get entities by versions', async () => {
    prismaEntityVersionFindManyMock.mockImplementationOnce(() => [
      {
        ...EXAMPLE_LAST_ENTITY_VERSION,
        entity: EXAMPLE_ENTITY,
        permissions: [],
        commit: EXAMPLE_COMMIT
      },
      {
        ...EXAMPLE_LAST_ENTITY_VERSION,
        entity: EXAMPLE_ENTITY,
        permissions: [],
        commit: EXAMPLE_COMMIT
      }
    ]);

    const args = {
      where: {
        builds: {
          some: {
            id: 'buildId'
          }
        }
      },
      include: {
        permissions: true,
        commit: true
      }
    };

    const expected = [
      {
        ...EXAMPLE_ENTITY,
        fields: undefined,
        permissions: []
      },
      {
        ...EXAMPLE_ENTITY,
        fields: undefined,
        permissions: []
      }
    ];

    expect(await service.getEntitiesByVersions(args)).toEqual(expected);
    expect(prismaEntityVersionFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityVersionFindManyMock).toBeCalledWith({
      where: {
        ...args.where,
        deleted: null
      },
      include: {
        ...args.include,
        entity: true,
        fields: undefined
      }
    });
  });

  it('should create default entities', async () => {
    jest
      .spyOn(service, 'bulkCreateEntities')
      .mockImplementationOnce(() => Promise.resolve());

    await expect(service.createDefaultEntities(EXAMPLE_APP_ID, EXAMPLE_USER))
      .resolves.toBeUndefined;
    expect(service.bulkCreateEntities).toHaveBeenCalledTimes(1);
    expect(service.bulkCreateEntities).toHaveBeenCalledWith(
      EXAMPLE_APP_ID,
      EXAMPLE_USER,
      DEFAULT_ENTITIES
    );
  });

  it('should create entities in bulk', async () => {
    jest.useFakeTimers();

    const EXAMPLE_ENTITY_FIELDS_DATA = [
      EXAMPLE_ENTITY_FIELD_DATA,
      EXAMPLE_ENTITY_FIELD_DATA
    ];
    const ENTITY_NAMES = {
      name: 'exemple',
      displayName: 'Example',
      pluralDisplayName: 'Examples',
      description: 'example entity'
    };
    const EXAMPLE_BULK_ENTITY_DATA = {
      id: EXAMPLE_ENTITY_ID,
      ...ENTITY_NAMES,
      fields: EXAMPLE_ENTITY_FIELDS_DATA
    };

    await expect(
      service.bulkCreateEntities(EXAMPLE_APP_ID, EXAMPLE_USER, [
        EXAMPLE_BULK_ENTITY_DATA,
        EXAMPLE_BULK_ENTITY_DATA
      ])
    ).resolves.toBeUndefined;
    expect(prismaEntityCreateMock).toHaveBeenCalledTimes(2);
    expect(prismaEntityCreateMock).toHaveBeenCalledWith({
      data: {
        id: EXAMPLE_ENTITY_ID,
        ...ENTITY_NAMES,
        app: { connect: { id: EXAMPLE_APP_ID } },
        lockedAt: new Date(),
        lockedByUser: {
          connect: {
            id: EXAMPLE_USER.id
          }
        },
        versions: {
          create: {
            ...ENTITY_NAMES,
            commit: undefined,
            versionNumber: CURRENT_VERSION_NUMBER,
            permissions: {
              create: DEFAULT_PERMISSIONS
            },

            fields: {
              create: EXAMPLE_ENTITY_FIELDS_DATA
            }
          }
        }
      }
    });

    jest.useRealTimers();
  });

  it('should create fields in bulk', async () => {
    const EXAMPLE_PERMANENT_ID = 'permanentId';
    const EXAMPLE_ENTITY_FIELDS_DATA_WITH_PERMANENT_IDS = [
      { ...EXAMPLE_ENTITY_FIELD_DATA, permanentId: EXAMPLE_PERMANENT_ID },
      { ...EXAMPLE_ENTITY_FIELD_DATA, permanentId: EXAMPLE_PERMANENT_ID }
    ];

    await expect(
      service.bulkCreateFields(
        EXAMPLE_USER,
        EXAMPLE_ENTITY_ID,
        EXAMPLE_ENTITY_FIELDS_DATA_WITH_PERMANENT_IDS
      )
    ).resolves.toBe(undefined);
    expect(prismaEntityFieldCreateMock).toHaveBeenCalledTimes(2);
    expect(prismaEntityFieldCreateMock).toHaveBeenCalledWith({
      data: {
        ...EXAMPLE_ENTITY_FIELD_DATA_WITH_NESTED_QUERY,
        permanentId: EXAMPLE_PERMANENT_ID
      }
    });
  });

  it('should get entity fields', async () => {
    const entity = {
      entityId: EXAMPLE_ENTITY_ID,
      versionNumber: EXAMPLE_CURRENT_ENTITY_VERSION.versionNumber,
      args: { where: {} }
    };
    const returnArgs = {
      ...entity.args,
      where: {
        ...entity.args.where,
        entityVersion: {
          entityId: entity.entityId,
          versionNumber: entity.versionNumber
        }
      }
    };
    expect(await service.getFields(entity.entityId, entity.args)).toEqual([
      EXAMPLE_ENTITY_FIELD
    ]);
    expect(prismaEntityFieldFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityFieldFindManyMock).toBeCalledWith(returnArgs);
  });

  it('should create a new version', async () => {
    const args = {
      data: {
        commit: { connect: { id: EXAMPLE_LAST_ENTITY_VERSION.commitId } },
        entity: { connect: { id: EXAMPLE_ENTITY_ID } }
      }
    };
    const entityVersionFindManyArgs = {
      where: {
        entity: { id: EXAMPLE_ENTITY_ID }
      },
      orderBy: {
        versionNumber: Prisma.SortOrder.asc
      }
    };

    const nextVersionNumber = EXAMPLE_LAST_ENTITY_VERSION.versionNumber + 1;
    const entityVersionCreateArgs = {
      data: {
        name: EXAMPLE_ENTITY.name,
        displayName: EXAMPLE_ENTITY.displayName,
        pluralDisplayName: EXAMPLE_ENTITY.pluralDisplayName,
        description: EXAMPLE_ENTITY.description,
        commit: {
          connect: {
            id: args.data.commit.connect.id
          }
        },
        versionNumber: nextVersionNumber,
        entity: {
          connect: {
            id: args.data.entity.connect.id
          }
        }
      }
    };

    const names = pick(EXAMPLE_LAST_ENTITY_VERSION, [
      'name',
      'displayName',
      'pluralDisplayName',
      'description'
    ]);

    const entityVersionFindSourceArgs = {
      where: {
        id: EXAMPLE_CURRENT_ENTITY_VERSION_ID
      },
      include: {
        fields: true,
        permissions: {
          include: {
            permissionRoles: true,
            permissionFields: {
              include: {
                permissionRoles: true,
                field: true
              }
            }
          }
        }
      }
    };
    const entityVersionFindTargetArgs = {
      where: {
        id: EXAMPLE_LAST_ENTITY_VERSION_ID
      }
    };

    const updateEntityVersionWithFieldsArgs = {
      where: {
        id: EXAMPLE_LAST_ENTITY_VERSION_ID
      },
      data: {
        entity: {
          update: {
            ...names,
            deletedAt: null
          }
        },
        ...names,
        fields: {
          create: [omit(EXAMPLE_ENTITY_FIELD, ['id', 'entityVersionId'])]
        }
      }
    };

    const updateEntityVersionWithPermissionsArgs = {
      where: {
        id: EXAMPLE_LAST_ENTITY_VERSION_ID
      },
      data: {
        permissions: {
          create: []
        }
      }
    };
    expect(await service.createVersion(args)).toEqual(
      EXAMPLE_CURRENT_ENTITY_VERSION
    );
    expect(prismaEntityVersionFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityVersionFindManyMock).toBeCalledWith(
      entityVersionFindManyArgs
    );

    expect(prismaEntityVersionCreateMock).toBeCalledTimes(1);
    expect(prismaEntityVersionCreateMock).toBeCalledWith(
      entityVersionCreateArgs
    );

    expect(prismaEntityVersionFindOneMock).toBeCalledTimes(2);
    expect(prismaEntityVersionFindOneMock.mock.calls).toEqual([
      [entityVersionFindSourceArgs],
      [entityVersionFindTargetArgs]
    ]);

    expect(prismaEntityVersionUpdateMock).toBeCalledTimes(2);
    expect(prismaEntityVersionUpdateMock.mock.calls).toEqual([
      [updateEntityVersionWithFieldsArgs],
      [updateEntityVersionWithPermissionsArgs]
    ]);
  });

  it('should discard pending changes', async () => {
    const entityVersionFindManyArgs = {
      where: {
        entity: { id: EXAMPLE_ENTITY_ID }
      },
      orderBy: {
        versionNumber: Prisma.SortOrder.asc
      },
      include: {
        entity: true
      }
    };

    const names = pick(EXAMPLE_LAST_ENTITY_VERSION, [
      'name',
      'displayName',
      'pluralDisplayName',
      'description'
    ]);

    const entityVersionFindSourceArgs = {
      where: {
        id: EXAMPLE_LAST_ENTITY_VERSION_ID
      },
      include: {
        fields: true,
        permissions: {
          include: {
            permissionRoles: true,
            permissionFields: {
              include: {
                permissionRoles: true,
                field: true
              }
            }
          }
        }
      }
    };
    const entityVersionFindTargetArgs = {
      where: {
        id: EXAMPLE_CURRENT_ENTITY_VERSION_ID
      }
    };

    const updateEntityVersionWithFieldsArgs = {
      where: {
        id: EXAMPLE_CURRENT_ENTITY_VERSION_ID
      },
      data: {
        entity: {
          update: {
            ...names,
            deletedAt: null
          }
        },
        ...names,
        fields: {
          create: [omit(EXAMPLE_ENTITY_FIELD, ['id', 'entityVersionId'])]
        }
      }
    };

    const updateEntityVersionWithPermissionsArgs = {
      where: {
        id: EXAMPLE_CURRENT_ENTITY_VERSION_ID
      },
      data: {
        permissions: {
          create: []
        }
      }
    };
    expect(
      await service.discardPendingChanges(EXAMPLE_ENTITY_ID, EXAMPLE_USER_ID)
    ).toEqual(EXAMPLE_ENTITY);
    expect(prismaEntityVersionFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityVersionFindManyMock).toBeCalledWith(
      entityVersionFindManyArgs
    );

    expect(prismaEntityVersionFindOneMock).toBeCalledTimes(2);
    expect(prismaEntityVersionFindOneMock.mock.calls).toEqual([
      [entityVersionFindSourceArgs],
      [entityVersionFindTargetArgs]
    ]);

    expect(prismaEntityVersionUpdateMock).toBeCalledTimes(3);
    expect(prismaEntityVersionUpdateMock.mock.calls).toEqual([
      [
        {
          where: {
            id: EXAMPLE_CURRENT_ENTITY_VERSION_ID
          },
          data: {
            fields: {
              deleteMany: {
                entityVersionId: EXAMPLE_CURRENT_ENTITY_VERSION_ID
              }
            },
            permissions: {
              deleteMany: {
                entityVersionId: EXAMPLE_CURRENT_ENTITY_VERSION_ID
              }
            }
          }
        }
      ],
      [updateEntityVersionWithFieldsArgs],
      [updateEntityVersionWithPermissionsArgs]
    ]);
  });

  it('should get many versions', async () => {
    const args = {};
    expect(await service.getVersions(args)).toEqual([
      EXAMPLE_CURRENT_ENTITY_VERSION,
      EXAMPLE_LAST_ENTITY_VERSION
    ]);
    expect(prismaEntityVersionFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityVersionFindManyMock).toBeCalledWith(args);
  });

  it('should get the latest versions', async () => {
    const args = {
      where: { app: { id: EXAMPLE_APP_ID } }
    };
    const findManyArgs = {
      where: {
        ...args.where,
        appId: args.where.app.id,
        deletedAt: null
      },
      select: {
        versions: {
          where: {
            versionNumber: {
              not: CURRENT_VERSION_NUMBER
            }
          },
          take: 1,
          orderBy: {
            versionNumber: Prisma.SortOrder.desc
          }
        }
      }
    };
    const findManyResult = [
      {
        ...EXAMPLE_ENTITY,
        versions: [EXAMPLE_LAST_ENTITY_VERSION]
      },
      {
        ...EXAMPLE_ENTITY,
        versions: []
      }
    ];
    prismaEntityFindManyMock.mockImplementationOnce(() => findManyResult);
    expect(await service.getLatestVersions(args)).toEqual([
      EXAMPLE_LAST_ENTITY_VERSION
    ]);
    expect(prismaEntityFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityFindManyMock).toBeCalledWith(findManyArgs);
  });

  it('should validate that entity ID exists in the current app and is persistent', async () => {
    const args = {
      entityId: EXAMPLE_ENTITY_ID,
      appId: EXAMPLE_ENTITY.appId
    };
    const findManyArgs = {
      where: {
        id: args.entityId,
        app: { id: args.appId },
        deletedAt: null
      }
    };
    expect(await service.isEntityInSameApp(args.entityId, args.appId)).toEqual(
      true
    );
    expect(prismaEntityFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityFindManyMock).toBeCalledWith(findManyArgs);
  });

  it('should validate that all listed field names exist in entity and return a set of non-matching field names', async () => {
    const args = {
      entityId: EXAMPLE_ENTITY_ID,
      fieldNames: [EXAMPLE_ENTITY_FIELD_NAME]
    };
    const uniqueNames = new Set(args.fieldNames);
    const findManyArgs = {
      where: {
        name: {
          in: Array.from(uniqueNames)
        },
        entityVersion: {
          entityId: args.entityId,
          versionNumber: EXAMPLE_CURRENT_ENTITY_VERSION.versionNumber
        }
      },
      select: { name: true }
    };
    expect(
      await service.validateAllFieldsExist(args.entityId, args.fieldNames)
    ).toEqual(new Set());
    expect(prismaEntityFieldFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityFieldFindManyMock).toBeCalledWith(findManyArgs);
  });

  it('should get a version commit', async () => {
    const entityVersionId = EXAMPLE_LAST_ENTITY_VERSION.id;
    const returnArgs = { where: { id: entityVersionId } };
    expect(await service.getVersionCommit(entityVersionId)).toEqual(
      EXAMPLE_COMMIT
    );
    expect(prismaEntityVersionFindOneMock).toBeCalledTimes(1);
    expect(prismaEntityVersionFindOneMock).toBeCalledWith(returnArgs);
  });

  it('should acquire a lock', async () => {
    const lockArgs = {
      args: { where: { id: EXAMPLE_ENTITY_ID } },
      user: EXAMPLE_USER
    };
    const entityId = lockArgs.args.where.id;
    expect(await service.acquireLock(lockArgs.args, lockArgs.user)).toEqual(
      EXAMPLE_ENTITY
    );
    expect(prismaEntityFindFirstMock).toBeCalledTimes(1);
    expect(prismaEntityFindFirstMock).toBeCalledWith({
      where: {
        id: entityId,
        deletedAt: null
      }
    });
    expect(prismaEntityUpdateMock).toBeCalledTimes(1);
    expect(prismaEntityUpdateMock).toBeCalledWith({
      where: {
        id: entityId
      },
      data: {
        lockedByUser: {
          connect: {
            id: lockArgs.user.id
          }
        },
        lockedAt: expect.any(Date)
      }
    });
  });

  it('should release a lock', async () => {
    const entityId = EXAMPLE_ENTITY_ID;
    const updateArgs = {
      where: {
        id: entityId
      },
      data: {
        lockedByUser: {
          disconnect: true
        },
        lockedAt: null
      }
    };
    expect(await service.releaseLock(entityId)).toEqual(EXAMPLE_ENTITY);
    expect(prismaEntityUpdateMock).toBeCalledTimes(1);
    expect(prismaEntityUpdateMock).toBeCalledWith(updateArgs);
  });

  it('should still call updateLock when an error occurs', async () => {
    jest.spyOn(service, 'updateLock');
    jest.spyOn(service, 'validateFieldMutationArgs').mockImplementation(() => {
      throw new Error();
    });

    const args = {
      where: { id: EXAMPLE_ENTITY_FIELD.id },
      data: EXAMPLE_ENTITY_FIELD_DATA_WITH_NESTED_QUERY
    };
    await expect(
      service.updateField(args, EXAMPLE_USER)
    ).rejects.toThrowError();
    expect(service.updateLock).toBeCalled();
  });

  it('should create entity field', async () => {
    expect(
      await service.createField(
        {
          data: {
            ...EXAMPLE_ENTITY_FIELD_DATA_WITH_NESTED_QUERY,
            entity: { connect: { id: EXAMPLE_ENTITY_ID } }
          }
        },
        EXAMPLE_USER
      )
    ).toEqual(EXAMPLE_ENTITY_FIELD);
    expect(prismaEntityFieldCreateMock).toBeCalledTimes(1);
    expect(prismaEntityFieldCreateMock).toBeCalledWith({
      data: {
        ...EXAMPLE_ENTITY_FIELD_DATA_WITH_NESTED_QUERY,
        permanentId: expect.any(String)
      }
    });
  });
  it('should fail to create entity field with bad name', async () => {
    await expect(
      service.createField(
        {
          data: {
            ...EXAMPLE_ENTITY_FIELD_DATA_WITH_NESTED_QUERY,
            name: 'Foo Bar',
            entity: { connect: { id: EXAMPLE_ENTITY_ID } }
          }
        },
        EXAMPLE_USER
      )
    ).rejects.toThrow(NAME_VALIDATION_ERROR_MESSAGE);
  });
  it('should update entity field', async () => {
    const args = {
      where: { id: EXAMPLE_ENTITY_FIELD.id },
      data: EXAMPLE_ENTITY_FIELD_DATA_WITH_NESTED_QUERY
    };
    expect(await service.updateField(args, EXAMPLE_USER)).toEqual(
      EXAMPLE_ENTITY_FIELD
    );
    expect(prismaEntityFieldUpdateMock).toBeCalledTimes(1);
    expect(prismaEntityFieldUpdateMock).toBeCalledWith(args);
  });

  it('should throw a "Record not found" error', async () => {
    const args = {
      where: {
        entityId: EXAMPLE_ENTITY_ID,
        action: EXAMPLE_ACTION,
        fieldPermanentId: EXAMPLE_ENTITY_FIELD.permanentId
      }
    };
    const user = EXAMPLE_USER;
    await expect(
      service.deleteEntityPermissionField(args, user)
    ).rejects.toThrowError('Record not found');
    expect(prismaEntityFindFirstMock).toBeCalledTimes(1);
    expect(prismaEntityFindFirstMock).toBeCalledWith({
      where: {
        id: args.where.entityId,
        deletedAt: null
      }
    });
    expect(prismaEntityPermissionFieldFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityPermissionFieldFindManyMock).toBeCalledWith({
      where: {
        permission: {
          entityVersion: {
            entityId: args.where.entityId,
            versionNumber: CURRENT_VERSION_NUMBER
          },
          action: args.where.action
        },
        fieldPermanentId: args.where.fieldPermanentId
      }
    });
  });

  it('create field by display name', async () => {
    expect(
      await service.createFieldByDisplayName(
        {
          data: {
            displayName: 'EXAMPLE_DISPLAY_NAME',
            entity: { connect: { id: 'EXAMPLE_ID' } }
          }
        },
        EXAMPLE_USER
      )
    ).toEqual(EXAMPLE_ENTITY_FIELD);
  });

  it('create field of date', async () => {
    const EXAMPLE_DATE_DISPLAY_NAME = 'EXAMPLE_DISPLAY_NAME' + ' date';

    expect(
      await service.createFieldCreateInputByDisplayName(
        {
          data: {
            displayName: EXAMPLE_DATE_DISPLAY_NAME,
            entity: EXAMPLE_ENTITY_WHERE_PARENT_ID
          }
        },
        EXAMPLE_ENTITY
      )
    ).toEqual({
      dataType: EnumDataType.DateTime,
      name: camelCase(EXAMPLE_DATE_DISPLAY_NAME),
      properties: {
        timeZone: 'localTime',
        dateOnly: false
      }
    });
  });
  it('create field of description', async () => {
    const EXAMPLE_DESCRIPTION_DISPLAY_NAME =
      'EXAMPLE_DISPLAY_NAME' + ' description';
    expect(
      await service.createFieldCreateInputByDisplayName(
        {
          data: {
            displayName: EXAMPLE_DESCRIPTION_DISPLAY_NAME,
            entity: EXAMPLE_ENTITY_WHERE_PARENT_ID
          }
        },
        EXAMPLE_ENTITY
      )
    ).toEqual({
      dataType: EnumDataType.MultiLineText,
      name: camelCase(EXAMPLE_DESCRIPTION_DISPLAY_NAME),
      properties: {
        maxLength: 1000
      }
    });
  });
  it('create field of email', async () => {
    const EXAMPLE_EMAIL_DISPLAY_NAME = 'EXAMPLE_DISPLAY_NAME' + ' email';
    expect(
      await service.createFieldCreateInputByDisplayName(
        {
          data: {
            displayName: EXAMPLE_EMAIL_DISPLAY_NAME,
            entity: EXAMPLE_ENTITY_WHERE_PARENT_ID
          }
        },
        EXAMPLE_ENTITY
      )
    ).toEqual({
      dataType: EnumDataType.Email,
      name: camelCase(EXAMPLE_EMAIL_DISPLAY_NAME),
      properties: {}
    });
  });
  it('create field of status', async () => {
    const EXAMPLE_STATUS_DISPLAY_NAME = 'EXAMPLE_DISPLAY_NAME' + ' status';
    expect(
      await service.createFieldCreateInputByDisplayName(
        {
          data: {
            displayName: EXAMPLE_STATUS_DISPLAY_NAME,
            entity: EXAMPLE_ENTITY_WHERE_PARENT_ID
          }
        },
        EXAMPLE_ENTITY
      )
    ).toEqual({
      dataType: EnumDataType.OptionSet,
      name: camelCase(EXAMPLE_STATUS_DISPLAY_NAME),
      properties: { options: [{ label: 'Option 1', value: 'Option1' }] }
    });
  });
  it('create field of boolean', async () => {
    const EXAMPLE_BOOLEAN_DISPLAY_NAME = 'is' + 'EXAMPLE_DISPLAY_NAME';
    expect(
      await service.createFieldCreateInputByDisplayName(
        {
          data: {
            displayName: EXAMPLE_BOOLEAN_DISPLAY_NAME,
            entity: EXAMPLE_ENTITY_WHERE_PARENT_ID
          }
        },
        EXAMPLE_ENTITY
      )
    ).toEqual({
      dataType: EnumDataType.Boolean,
      name: camelCase(EXAMPLE_BOOLEAN_DISPLAY_NAME),
      properties: {}
    });
  });
  it('create single field of lookup', async () => {
    prismaEntityFieldFindManyMock.mockImplementationOnce(() => []);
    const [relatedEntity] = prismaEntityFindManyMock();
    prismaEntityFindManyMock.mockClear();
    const query = relatedEntity.displayName.toLowerCase();
    const name = camelCase(query);
    expect(
      await service.createFieldCreateInputByDisplayName(
        {
          data: {
            displayName: query,
            entity: EXAMPLE_ENTITY_WHERE_PARENT_ID
          }
        },
        EXAMPLE_ENTITY
      )
    ).toEqual({
      dataType: EnumDataType.Lookup,
      properties: {
        relatedEntityId: relatedEntity.id,
        allowMultipleSelection: false
      },
      name: camelCase(relatedEntity.displayName)
    });
    expect(prismaEntityFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityFindManyMock).toBeCalledWith({
      where: {
        ...createEntityNamesWhereInput(name, EXAMPLE_ENTITY.appId),
        deletedAt: null
      },
      take: 1
    });
    expect(prismaEntityFieldFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityFieldFindManyMock).toBeCalledWith({
      where: {
        name,
        entityVersion: {
          entityId: EXAMPLE_ENTITY_ID,
          versionNumber: CURRENT_VERSION_NUMBER
        }
      }
    });
  });
  it('create field of plural lookup', async () => {
    prismaEntityFieldFindManyMock.mockImplementationOnce(() => []);
    const [relatedEntity] = prismaEntityFindManyMock();
    prismaEntityFindManyMock.mockClear();
    const query = relatedEntity.pluralDisplayName.toLowerCase();
    expect(
      await service.createFieldCreateInputByDisplayName(
        {
          data: {
            displayName: query,
            entity: EXAMPLE_ENTITY_WHERE_PARENT_ID
          }
        },
        EXAMPLE_ENTITY
      )
    ).toEqual({
      dataType: EnumDataType.Lookup,
      properties: {
        relatedEntityId: relatedEntity.id,
        allowMultipleSelection: true
      },
      name: camelCase(query)
    });
    expect(prismaEntityFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityFieldFindManyMock).toBeCalledTimes(1);
  });
  it('pending changed entities "create"', async () => {
    prismaEntityFindManyMock.mockImplementationOnce(() => [
      {
        ...EXAMPLE_ENTITY,
        versions: [EXAMPLE_CURRENT_ENTITY_VERSION]
      }
    ]);
    expect(
      await service.getChangedEntities(EXAMPLE_ENTITY.appId, EXAMPLE_USER_ID)
    ).toEqual([EXAMPLE_ENTITY_PENDING_CHANGE_CREATE]);
  });
  it('pending changed entities "update"', async () => {
    prismaEntityFindManyMock.mockImplementationOnce(() => [
      {
        ...EXAMPLE_ENTITY,
        versions: [
          EXAMPLE_CURRENT_ENTITY_VERSION,
          EXAMPLE_CURRENT_ENTITY_VERSION
        ]
      }
    ]);
    expect(
      await service.getChangedEntities(EXAMPLE_ENTITY.appId, EXAMPLE_USER_ID)
    ).toEqual([EXAMPLE_ENTITY_PENDING_CHANGE_UPDATE]);
  });
  it('pending changed entities "delete"', async () => {
    prismaEntityFindManyMock.mockImplementationOnce(() => [
      EXAMPLE_DELETED_ENTITY
    ]);
    expect(
      await service.getChangedEntities(EXAMPLE_ENTITY.appId, EXAMPLE_USER_ID)
    ).toEqual([EXAMPLE_ENTITY_PENDING_CHANGE_DELETE]);
  });
  it('should have no pending changes when the current and last entity versions are the same', async () => {
    const LAST_ENTITY_VERSION = {
      ...EXAMPLE_CURRENT_ENTITY_VERSION,
      versionNumber: 2
    };

    prismaEntityVersionFindManyMock.mockImplementationOnce(() => [
      EXAMPLE_CURRENT_ENTITY_VERSION,
      { ...EXAMPLE_CURRENT_ENTITY_VERSION, versionNumber: 1 },
      LAST_ENTITY_VERSION
    ]);
    areDifferentMock.mockImplementationOnce(() => false);

    expect(await service.hasPendingChanges(EXAMPLE_ENTITY.id)).toBe(false);
    expect(areDifferentMock).toBeCalledWith(
      EXAMPLE_CURRENT_ENTITY_VERSION,
      LAST_ENTITY_VERSION,
      expect.anything()
    );
  });
  it('should have pending changes when the current and last entity versions are different', async () => {
    const CURRENT_ENTITY_VERSION_WITH_CHANGES = {
      ...EXAMPLE_LAST_ENTITY_VERSION,
      displayName: 'new entity name'
    };

    prismaEntityVersionFindManyMock.mockImplementationOnce(() => [
      CURRENT_ENTITY_VERSION_WITH_CHANGES,
      EXAMPLE_LAST_ENTITY_VERSION
    ]);
    areDifferentMock.mockImplementationOnce(() => true);

    expect(await service.hasPendingChanges(EXAMPLE_ENTITY.id)).toBe(true);
    expect(areDifferentMock).toBeCalledWith(
      CURRENT_ENTITY_VERSION_WITH_CHANGES,
      EXAMPLE_LAST_ENTITY_VERSION,
      expect.anything()
    );
  });
  it('should have pending changes when there is only one entity version', async () => {
    prismaEntityVersionFindManyMock.mockImplementationOnce(() => [
      EXAMPLE_CURRENT_ENTITY_VERSION
    ]);
    areDifferentMock.mockImplementationOnce(() => true);

    expect(await service.hasPendingChanges(EXAMPLE_ENTITY.id)).toBe(true);
    expect(areDifferentMock).toBeCalledWith(
      EXAMPLE_CURRENT_ENTITY_VERSION,
      undefined,
      expect.anything()
    );
  });
  it('should have no pending changes when there is only one entity version and it was deleted', async () => {
    prismaEntityVersionFindManyMock.mockImplementationOnce(() => [
      {
        ...EXAMPLE_CURRENT_ENTITY_VERSION,
        deleted: true
      }
    ]);
    areDifferentMock.mockImplementationOnce(() => true);

    expect(await service.hasPendingChanges(EXAMPLE_ENTITY.id)).toBe(false);
    expect(areDifferentMock).not.toBeCalled();
  });
  it.each([
    [
      'updated',
      {
        ...EXAMPLE_LOCKED_ENTITY,
        lockedByUser: EXAMPLE_USER,
        versions: [EXAMPLE_LAST_ENTITY_VERSION]
      },
      {
        resourceId: EXAMPLE_LOCKED_ENTITY.id,
        action: EnumPendingChangeAction.Update,
        resourceType: EnumPendingChangeResourceType.Entity,
        versionNumber: EXAMPLE_LAST_ENTITY_VERSION.versionNumber
      }
    ],
    [
      'deleted',
      {
        ...EXAMPLE_DELETED_ENTITY,
        lockedByUserId: EXAMPLE_USER_ID,
        lockedAt: new Date(),
        lockedByUser: EXAMPLE_USER
      },
      {
        resourceId: EXAMPLE_DELETED_ENTITY.id,
        action: EnumPendingChangeAction.Delete,
        resourceType: EnumPendingChangeResourceType.Entity,
        versionNumber: CURRENT_VERSION_NUMBER
      }
    ]
  ])(
    'should get changed (%s) entities by commit',
    async (_action, entity, partialPendingChange) => {
      const RESULTING_PENDING_CHANGE = {
        ...partialPendingChange,
        resource: entity
      };

      prismaEntityFindManyMock.mockImplementationOnce(() => [entity, entity]);

      expect(
        await service.getChangedEntitiesByCommit(EXAMPLE_COMMIT_ID)
      ).toEqual([RESULTING_PENDING_CHANGE, RESULTING_PENDING_CHANGE]);
      expect(prismaEntityFindManyMock).toBeCalledTimes(1);
      expect(prismaEntityFindManyMock).toBeCalledWith({
        where: {
          versions: {
            some: {
              commitId: EXAMPLE_COMMIT_ID
            }
          }
        },
        include: {
          lockedByUser: true,
          versions: {
            where: {
              commitId: EXAMPLE_COMMIT_ID
            }
          }
        }
      });
    }
  );
  it('should get permissions', async () => {
    const expected = [EXAMPLE_ENTITY_PERMISSION, EXAMPLE_ENTITY_PERMISSION];
    jest
      .spyOn(service, 'getVersionPermissions')
      .mockResolvedValueOnce(expected);

    expect(
      await service.getPermissions(EXAMPLE_ENTITY_ID, EXAMPLE_ACTION)
    ).toEqual(expected);
    expect(service.getVersionPermissions).toBeCalledTimes(1);
    expect(service.getVersionPermissions).toBeCalledWith(
      EXAMPLE_ENTITY_ID,
      CURRENT_VERSION_NUMBER,
      EXAMPLE_ACTION
    );
  });
  it('should get version permissions', async () => {
    prismaEntityPermissionFindManyMock.mockReturnValueOnce([
      EXAMPLE_ENTITY_PERMISSION_WITH_ROLES_AND_FIELDS,
      EXAMPLE_ENTITY_PERMISSION_WITH_ROLES_AND_FIELDS
    ]);
    expect(
      await service.getVersionPermissions(
        EXAMPLE_ENTITY_ID,
        CURRENT_VERSION_NUMBER,
        EXAMPLE_ACTION
      )
    ).toEqual([
      EXAMPLE_ENTITY_PERMISSION_WITH_ROLES_AND_FIELDS,
      EXAMPLE_ENTITY_PERMISSION_WITH_ROLES_AND_FIELDS
    ]);
    expect(prismaEntityPermissionFindManyMock).toBeCalledTimes(1);
    expect(prismaEntityPermissionFindManyMock).toBeCalledWith({
      where: {
        entityVersion: {
          entityId: EXAMPLE_ENTITY_ID,
          versionNumber: CURRENT_VERSION_NUMBER,
          entity: {
            deletedAt: null
          }
        },
        action: EXAMPLE_ACTION
      },
      orderBy: {
        action: Prisma.SortOrder.asc
      },
      include: {
        permissionRoles: {
          orderBy: {
            appRoleId: Prisma.SortOrder.asc
          },
          include: {
            appRole: true
          }
        },
        permissionFields: {
          orderBy: {
            fieldPermanentId: Prisma.SortOrder.asc
          },
          include: {
            field: true,
            permissionRoles: {
              orderBy: {
                appRoleId: Prisma.SortOrder.asc
              },
              include: {
                appRole: true
              }
            }
          }
        }
      }
    });
  });
  it('should add an entity permission field', async () => {
    const args = {
      data: {
        entity: EXAMPLE_ENTITY_WHERE_PARENT_ID,
        fieldName: EXAMPLE_ENTITY_FIELD_NAME,
        action: EXAMPLE_ACTION
      }
    };
    jest
      .spyOn(service, 'validateAllFieldsExist')
      .mockResolvedValueOnce(new Set());
    prismaEntityVersionFindOneMock.mockResolvedValueOnce(
      EXAMPLE_CURRENT_ENTITY_VERSION
    );

    expect(await service.addEntityPermissionField(args, EXAMPLE_USER)).toEqual(
      EXAMPLE_ENTITY_PERMISSION_FIELD
    );
    expect(prismaEntityVersionFindOneMock).toBeCalledTimes(1);
    expect(prismaEntityVersionFindOneMock).toBeCalledWith({
      where: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        entityId_versionNumber: {
          entityId: args.data.entity.connect.id,
          versionNumber: CURRENT_VERSION_NUMBER
        }
      }
    });
    expect(prismaEntityPermissionFieldCreateMock).toBeCalledTimes(1);
    expect(prismaEntityPermissionFieldCreateMock).toBeCalledWith({
      data: {
        field: {
          connect: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            entityVersionId_name: {
              entityVersionId: EXAMPLE_CURRENT_ENTITY_VERSION_ID,
              name: args.data.fieldName
            }
          }
        },
        permission: {
          connect: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            entityVersionId_action: {
              entityVersionId: EXAMPLE_CURRENT_ENTITY_VERSION_ID,
              action: args.data.action
            }
          }
        }
      },
      include: {
        field: true
      }
    });
  });
  it("should throw an error when the field that we are adding to the permission doesn't exist", async () => {
    const args = {
      data: {
        entity: EXAMPLE_ENTITY_WHERE_PARENT_ID,
        fieldName: EXAMPLE_NON_EXISTING_ENTITY_FIELD_NAME,
        action: EXAMPLE_ACTION
      }
    };
    jest
      .spyOn(service, 'validateAllFieldsExist')
      .mockResolvedValueOnce(new Set([EXAMPLE_NON_EXISTING_ENTITY_FIELD_NAME]));

    await expect(
      service.addEntityPermissionField(args, EXAMPLE_USER)
    ).rejects.toThrow(/invalid field selected/i);
  });
  it('should update an entity permission field roles', async () => {
    const args = {
      data: {
        permissionField: {
          connect: { id: EXAMPLE_ENTITY_PERMISSION_FIELD.id }
        },
        deletePermissionRoles: [{ id: 'id1' }, { id: 'id2' }],
        addPermissionRoles: [{ id: EXAMPLE_ENTITY_PERMISSION_ROLE.id }]
      }
    };
    const expected = {
      ...EXAMPLE_ENTITY_PERMISSION_FIELD,
      entityVersionId: EXAMPLE_CURRENT_ENTITY_VERSION_ID,
      permissionRoles: [EXAMPLE_ENTITY_PERMISSION_ROLE]
    };

    prismaEntityPermissionFieldFindUniqueMock
      .mockResolvedValueOnce(
        EXAMPLE_ENTITY_PERMISSION_FIELD_WITH_PERMISSION_AND_ENTITY_VERSION
      ) // before update
      .mockResolvedValueOnce(expected); // after update

    expect(
      await service.updateEntityPermissionFieldRoles(args, EXAMPLE_USER)
    ).toEqual(expected);
    expect(prismaEntityPermissionFieldFindUniqueMock).toBeCalledTimes(2);
    expect(prismaEntityPermissionFieldFindUniqueMock).nthCalledWith(1, {
      where: {
        id: args.data.permissionField.connect.id
      },
      include: {
        permission: {
          include: {
            entityVersion: true
          }
        }
      }
    });
    expect(prismaEntityPermissionFieldFindUniqueMock).nthCalledWith(2, {
      where: {
        id: args.data.permissionField.connect.id
      },
      include: {
        field: true,
        permissionRoles: {
          include: {
            appRole: true
          }
        }
      }
    });
    expect(prismaEntityPermissionFieldUpdateMock).toBeCalledTimes(2);
    expect(prismaEntityPermissionFieldUpdateMock).nthCalledWith(1, {
      where: {
        id: args.data.permissionField.connect.id
      },
      data: {
        permissionRoles: {
          connect: [{ id: EXAMPLE_ENTITY_PERMISSION_ROLE.id }]
        }
      }
    });
    expect(prismaEntityPermissionFieldUpdateMock).nthCalledWith(2, {
      where: {
        id: args.data.permissionField.connect.id
      },
      data: {
        permissionRoles: {
          disconnect: [{ id: 'id1' }, { id: 'id2' }]
        }
      }
    });
  });
  it('should only add entity permission field roles', async () => {
    const args = {
      data: {
        permissionField: {
          connect: { id: EXAMPLE_ENTITY_PERMISSION_FIELD.id }
        },
        deletePermissionRoles: [],
        addPermissionRoles: [{ id: EXAMPLE_ENTITY_PERMISSION_ROLE.id }]
      }
    };

    prismaEntityPermissionFieldFindUniqueMock.mockResolvedValueOnce(
      EXAMPLE_ENTITY_PERMISSION_FIELD_WITH_PERMISSION_AND_ENTITY_VERSION
    );

    await service.updateEntityPermissionFieldRoles(args, EXAMPLE_USER);
    expect(prismaEntityPermissionFieldUpdateMock).toBeCalledTimes(1);
    expect(prismaEntityPermissionFieldUpdateMock).toBeCalledWith({
      where: {
        id: args.data.permissionField.connect.id
      },
      data: {
        permissionRoles: {
          connect: [{ id: EXAMPLE_ENTITY_PERMISSION_ROLE.id }]
        }
      }
    });
  });
  it('should only delete entity permission field roles', async () => {
    const args = {
      data: {
        permissionField: {
          connect: { id: EXAMPLE_ENTITY_PERMISSION_FIELD.id }
        },
        deletePermissionRoles: [{ id: 'id1' }, { id: 'id2' }],
        addPermissionRoles: []
      }
    };

    prismaEntityPermissionFieldFindUniqueMock.mockResolvedValueOnce(
      EXAMPLE_ENTITY_PERMISSION_FIELD_WITH_PERMISSION_AND_ENTITY_VERSION
    );

    await service.updateEntityPermissionFieldRoles(args, EXAMPLE_USER);
    expect(prismaEntityPermissionFieldUpdateMock).toBeCalledTimes(1);
    expect(prismaEntityPermissionFieldUpdateMock).toBeCalledWith({
      where: {
        id: args.data.permissionField.connect.id
      },
      data: {
        permissionRoles: {
          disconnect: [{ id: 'id1' }, { id: 'id2' }]
        }
      }
    });
  });
  it("should throw an error when the permission field we are updating doesn't exist", async () => {
    const args = {
      data: {
        permissionField: {
          connect: { id: EXAMPLE_ENTITY_PERMISSION_FIELD.id }
        },
        deletePermissionRoles: [{ id: 'id1' }, { id: 'id2' }],
        addPermissionRoles: [{ id: EXAMPLE_ENTITY_PERMISSION_ROLE.id }]
      }
    };
    prismaEntityPermissionFieldFindUniqueMock.mockResolvedValueOnce(null);
    await expect(
      service.updateEntityPermissionFieldRoles(args, EXAMPLE_USER)
    ).rejects.toThrowError(/cannot find entity permission field/i);
  });
  it('should throw an error when the permission field we are updating is a committed version (not the current version)', async () => {
    const args = {
      data: {
        permissionField: {
          connect: { id: EXAMPLE_ENTITY_PERMISSION_FIELD.id }
        },
        deletePermissionRoles: [{ id: 'id1' }, { id: 'id2' }],
        addPermissionRoles: [{ id: EXAMPLE_ENTITY_PERMISSION_ROLE.id }]
      }
    };
    prismaEntityPermissionFieldFindUniqueMock.mockResolvedValueOnce({
      ...EXAMPLE_ENTITY_PERMISSION_FIELD,
      permission: {
        ...EXAMPLE_ENTITY_PERMISSION,
        entityVersion: EXAMPLE_LAST_ENTITY_VERSION
      }
    });
    await expect(
      service.updateEntityPermissionFieldRoles(args, EXAMPLE_USER)
    ).rejects.toThrowError(/cannot update settings on committed versions/i);
  });
  it('should create default related fields', async () => {
    const EXAMPLE_LOOKUP_FIELD = {
      ...EXAMPLE_ENTITY_FIELD,
      dataType: EnumDataType.Lookup,
      properties: {
        allowMultipleSelection: true,
        relatedEntityId: 'relatedEntityId'
      }
    };
    const args = {
      where: {
        id: EXAMPLE_LOOKUP_FIELD.id
      },
      relatedFieldName: 'relatedFieldName',
      relatedFieldDisplayName: 'relatedFieldDisplayName'
    };
    const updatedLookupField = {
      ...EXAMPLE_LOOKUP_FIELD,
      properties: {
        ...EXAMPLE_LOOKUP_FIELD.properties,
        relatedFieldId: EXAMPLE_CUID
      }
    };

    jest.spyOn(service, 'validateFieldMutationArgs').mockReturnValueOnce();
    prismaEntityFieldFindFirstMock.mockReturnValueOnce({
      ...EXAMPLE_LOOKUP_FIELD,
      entityVersion: EXAMPLE_CURRENT_ENTITY_VERSION
    });
    prismaEntityFieldUpdateMock.mockReturnValueOnce(updatedLookupField);

    expect(await service.createDefaultRelatedField(args, EXAMPLE_USER)).toEqual(
      updatedLookupField
    );
    expect(prismaEntityFieldFindFirstMock).toBeCalledTimes(1);
    expect(prismaEntityFieldFindFirstMock).toBeCalledWith({
      where: {
        ...args.where,
        entityVersion: {
          versionNumber: CURRENT_VERSION_NUMBER
        }
      },
      include: { entityVersion: true }
    });
    expect(service.validateFieldMutationArgs).toBeCalledTimes(1);
    expect(service.validateFieldMutationArgs).toBeCalledWith(
      {
        ...args,
        data: {
          properties: EXAMPLE_LOOKUP_FIELD.properties,
          dataType: EXAMPLE_LOOKUP_FIELD.dataType
        }
      },
      EXAMPLE_ENTITY
    );

    expect(prismaEntityFieldCreateMock).toBeCalledTimes(1);
    expect(prismaEntityFieldCreateMock).toBeCalledWith({
      data: {
        name: args.relatedFieldName,
        displayName: args.relatedFieldDisplayName,
        dataType: EnumDataType.Lookup,
        permanentId: EXAMPLE_CUID,
        entityVersion: {
          connect: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            entityId_versionNumber: {
              entityId: EXAMPLE_LOOKUP_FIELD.properties.relatedEntityId,
              versionNumber: CURRENT_VERSION_NUMBER
            }
          }
        },
        properties: {
          allowMultipleSelection: !EXAMPLE_LOOKUP_FIELD.properties
            .allowMultipleSelection,
          relatedEntityId: EXAMPLE_ENTITY_ID,
          relatedFieldId: EXAMPLE_LOOKUP_FIELD.permanentId
        },
        required: false,
        unique: false,
        searchable: true,
        description: ''
      }
    });
    expect(prismaEntityFieldUpdateMock).toBeCalledTimes(1);
    expect(prismaEntityFieldUpdateMock).toBeCalledWith({
      where: {
        id: EXAMPLE_LOOKUP_FIELD.id
      },
      data: {
        properties: updatedLookupField.properties
      }
    });
  });
});
