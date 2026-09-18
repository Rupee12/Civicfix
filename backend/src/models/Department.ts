import { Schema, model, type HydratedDocument, type Model } from "mongoose";

export interface Department {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DepartmentDocument = HydratedDocument<Department>;

const departmentSchema = new Schema<Department>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  description: { type: String, trim: true, maxlength: 500 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export const DepartmentModel: Model<Department> = model<Department>("Department", departmentSchema);