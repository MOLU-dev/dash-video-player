import * as jspb from 'google-protobuf'



export class Category extends jspb.Message {
  getId(): string;
  setId(value: string): Category;

  getName(): string;
  setName(value: string): Category;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Category.AsObject;
  static toObject(includeInstance: boolean, msg: Category): Category.AsObject;
  static serializeBinaryToWriter(message: Category, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Category;
  static deserializeBinaryFromReader(message: Category, reader: jspb.BinaryReader): Category;
}

export namespace Category {
  export type AsObject = {
    id: string,
    name: string,
  }
}

export class Subcategory extends jspb.Message {
  getId(): string;
  setId(value: string): Subcategory;

  getCategoryId(): string;
  setCategoryId(value: string): Subcategory;

  getName(): string;
  setName(value: string): Subcategory;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Subcategory.AsObject;
  static toObject(includeInstance: boolean, msg: Subcategory): Subcategory.AsObject;
  static serializeBinaryToWriter(message: Subcategory, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Subcategory;
  static deserializeBinaryFromReader(message: Subcategory, reader: jspb.BinaryReader): Subcategory;
}

export namespace Subcategory {
  export type AsObject = {
    id: string,
    categoryId: string,
    name: string,
  }
}

export class CreateCategoryRequest extends jspb.Message {
  getName(): string;
  setName(value: string): CreateCategoryRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateCategoryRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CreateCategoryRequest): CreateCategoryRequest.AsObject;
  static serializeBinaryToWriter(message: CreateCategoryRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateCategoryRequest;
  static deserializeBinaryFromReader(message: CreateCategoryRequest, reader: jspb.BinaryReader): CreateCategoryRequest;
}

export namespace CreateCategoryRequest {
  export type AsObject = {
    name: string,
  }
}

export class CreateCategoryResponse extends jspb.Message {
  getCategory(): Category | undefined;
  setCategory(value?: Category): CreateCategoryResponse;
  hasCategory(): boolean;
  clearCategory(): CreateCategoryResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateCategoryResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CreateCategoryResponse): CreateCategoryResponse.AsObject;
  static serializeBinaryToWriter(message: CreateCategoryResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateCategoryResponse;
  static deserializeBinaryFromReader(message: CreateCategoryResponse, reader: jspb.BinaryReader): CreateCategoryResponse;
}

export namespace CreateCategoryResponse {
  export type AsObject = {
    category?: Category.AsObject,
  }
}

export class UpdateCategoryRequest extends jspb.Message {
  getId(): string;
  setId(value: string): UpdateCategoryRequest;

  getName(): string;
  setName(value: string): UpdateCategoryRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateCategoryRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateCategoryRequest): UpdateCategoryRequest.AsObject;
  static serializeBinaryToWriter(message: UpdateCategoryRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateCategoryRequest;
  static deserializeBinaryFromReader(message: UpdateCategoryRequest, reader: jspb.BinaryReader): UpdateCategoryRequest;
}

export namespace UpdateCategoryRequest {
  export type AsObject = {
    id: string,
    name: string,
  }
}

export class UpdateCategoryResponse extends jspb.Message {
  getCategory(): Category | undefined;
  setCategory(value?: Category): UpdateCategoryResponse;
  hasCategory(): boolean;
  clearCategory(): UpdateCategoryResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateCategoryResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateCategoryResponse): UpdateCategoryResponse.AsObject;
  static serializeBinaryToWriter(message: UpdateCategoryResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateCategoryResponse;
  static deserializeBinaryFromReader(message: UpdateCategoryResponse, reader: jspb.BinaryReader): UpdateCategoryResponse;
}

export namespace UpdateCategoryResponse {
  export type AsObject = {
    category?: Category.AsObject,
  }
}

export class ListCategoriesResponse extends jspb.Message {
  getCategoriesList(): Array<Category>;
  setCategoriesList(value: Array<Category>): ListCategoriesResponse;
  clearCategoriesList(): ListCategoriesResponse;
  addCategories(value?: Category, index?: number): Category;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListCategoriesResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListCategoriesResponse): ListCategoriesResponse.AsObject;
  static serializeBinaryToWriter(message: ListCategoriesResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListCategoriesResponse;
  static deserializeBinaryFromReader(message: ListCategoriesResponse, reader: jspb.BinaryReader): ListCategoriesResponse;
}

export namespace ListCategoriesResponse {
  export type AsObject = {
    categoriesList: Array<Category.AsObject>,
  }
}

export class DeleteCategoryRequest extends jspb.Message {
  getId(): string;
  setId(value: string): DeleteCategoryRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteCategoryRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteCategoryRequest): DeleteCategoryRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteCategoryRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteCategoryRequest;
  static deserializeBinaryFromReader(message: DeleteCategoryRequest, reader: jspb.BinaryReader): DeleteCategoryRequest;
}

export namespace DeleteCategoryRequest {
  export type AsObject = {
    id: string,
  }
}

export class CreateSubcategoryRequest extends jspb.Message {
  getCategoryId(): string;
  setCategoryId(value: string): CreateSubcategoryRequest;

  getName(): string;
  setName(value: string): CreateSubcategoryRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateSubcategoryRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CreateSubcategoryRequest): CreateSubcategoryRequest.AsObject;
  static serializeBinaryToWriter(message: CreateSubcategoryRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateSubcategoryRequest;
  static deserializeBinaryFromReader(message: CreateSubcategoryRequest, reader: jspb.BinaryReader): CreateSubcategoryRequest;
}

export namespace CreateSubcategoryRequest {
  export type AsObject = {
    categoryId: string,
    name: string,
  }
}

export class CreateSubcategoryResponse extends jspb.Message {
  getSubcategory(): Subcategory | undefined;
  setSubcategory(value?: Subcategory): CreateSubcategoryResponse;
  hasSubcategory(): boolean;
  clearSubcategory(): CreateSubcategoryResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateSubcategoryResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CreateSubcategoryResponse): CreateSubcategoryResponse.AsObject;
  static serializeBinaryToWriter(message: CreateSubcategoryResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateSubcategoryResponse;
  static deserializeBinaryFromReader(message: CreateSubcategoryResponse, reader: jspb.BinaryReader): CreateSubcategoryResponse;
}

export namespace CreateSubcategoryResponse {
  export type AsObject = {
    subcategory?: Subcategory.AsObject,
  }
}

export class UpdateSubcategoryRequest extends jspb.Message {
  getId(): string;
  setId(value: string): UpdateSubcategoryRequest;

  getName(): string;
  setName(value: string): UpdateSubcategoryRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateSubcategoryRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateSubcategoryRequest): UpdateSubcategoryRequest.AsObject;
  static serializeBinaryToWriter(message: UpdateSubcategoryRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateSubcategoryRequest;
  static deserializeBinaryFromReader(message: UpdateSubcategoryRequest, reader: jspb.BinaryReader): UpdateSubcategoryRequest;
}

export namespace UpdateSubcategoryRequest {
  export type AsObject = {
    id: string,
    name: string,
  }
}

export class UpdateSubcategoryResponse extends jspb.Message {
  getSubcategory(): Subcategory | undefined;
  setSubcategory(value?: Subcategory): UpdateSubcategoryResponse;
  hasSubcategory(): boolean;
  clearSubcategory(): UpdateSubcategoryResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateSubcategoryResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateSubcategoryResponse): UpdateSubcategoryResponse.AsObject;
  static serializeBinaryToWriter(message: UpdateSubcategoryResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateSubcategoryResponse;
  static deserializeBinaryFromReader(message: UpdateSubcategoryResponse, reader: jspb.BinaryReader): UpdateSubcategoryResponse;
}

export namespace UpdateSubcategoryResponse {
  export type AsObject = {
    subcategory?: Subcategory.AsObject,
  }
}

export class ListSubcategoriesRequest extends jspb.Message {
  getCategoryId(): string;
  setCategoryId(value: string): ListSubcategoriesRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListSubcategoriesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ListSubcategoriesRequest): ListSubcategoriesRequest.AsObject;
  static serializeBinaryToWriter(message: ListSubcategoriesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListSubcategoriesRequest;
  static deserializeBinaryFromReader(message: ListSubcategoriesRequest, reader: jspb.BinaryReader): ListSubcategoriesRequest;
}

export namespace ListSubcategoriesRequest {
  export type AsObject = {
    categoryId: string,
  }
}

export class ListSubcategoriesResponse extends jspb.Message {
  getSubcategoriesList(): Array<Subcategory>;
  setSubcategoriesList(value: Array<Subcategory>): ListSubcategoriesResponse;
  clearSubcategoriesList(): ListSubcategoriesResponse;
  addSubcategories(value?: Subcategory, index?: number): Subcategory;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ListSubcategoriesResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ListSubcategoriesResponse): ListSubcategoriesResponse.AsObject;
  static serializeBinaryToWriter(message: ListSubcategoriesResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ListSubcategoriesResponse;
  static deserializeBinaryFromReader(message: ListSubcategoriesResponse, reader: jspb.BinaryReader): ListSubcategoriesResponse;
}

export namespace ListSubcategoriesResponse {
  export type AsObject = {
    subcategoriesList: Array<Subcategory.AsObject>,
  }
}

export class DeleteSubcategoryRequest extends jspb.Message {
  getId(): string;
  setId(value: string): DeleteSubcategoryRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): DeleteSubcategoryRequest.AsObject;
  static toObject(includeInstance: boolean, msg: DeleteSubcategoryRequest): DeleteSubcategoryRequest.AsObject;
  static serializeBinaryToWriter(message: DeleteSubcategoryRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): DeleteSubcategoryRequest;
  static deserializeBinaryFromReader(message: DeleteSubcategoryRequest, reader: jspb.BinaryReader): DeleteSubcategoryRequest;
}

export namespace DeleteSubcategoryRequest {
  export type AsObject = {
    id: string,
  }
}

