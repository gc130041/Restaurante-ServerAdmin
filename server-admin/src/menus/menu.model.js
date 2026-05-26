'use strict';

import mongoose from 'mongoose';

const BOMComponentSchema = new mongoose.Schema({
  componentId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'recipe.componentType' },
  componentType: { type: String, required: true, enum: ['Ingredient', 'Menu'] },
  quantityRequired: { type: Number, required: true, min: 0.0001 }
}, { _id: false });

const MenuSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, required: false, index: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, maxLength: [500, 'La descripción no puede exceder los 500 caracteres'] },
  itemType: { type: String, required: true, enum: ['SINGLE', 'COMBO'], default: 'SINGLE', index: true },
  sku: { type: String, required: true, unique: true },
  price: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    enum: ['Entrada', 'Plato Fuerte', 'Postre', 'Bebida', 'Acompañamiento', 'Combo', 'Otro'],
    default: 'Otro'
  },
  isSubRecipe: { type: Boolean, default: false, index: true },
  recipe: [BOMComponentSchema],
  promotion: {
    isActive: { type: Boolean, default: false },
    discountType: { type: String, enum: ['PERCENTAGE', 'FIXED_PRICE'] },
    discountValue: { type: Number, min: 0 },
    startsAt: { type: Date },
    endsAt: { type: Date }
  },
  image: { type: String, default: 'menus/default_menu' },
  isActive: { type: Boolean, default: true }
}, { collection: 'menus', timestamps: true, autoIndex: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

MenuSchema.index({ companyId: 1, sku: 1 });

/**
 * Virtual que calcula el precio efectivo aplicando promociones si están activas y vigentes.
 */
MenuSchema.virtual('effectivePrice').get(function() {
  const now = new Date();
  
  if (!this.promotion || !this.promotion.isActive) return this.price;
  if (this.promotion.startsAt && now < this.promotion.startsAt) return this.price;
  if (this.promotion.endsAt && now > this.promotion.endsAt) return this.price;

  if (this.promotion.discountType === 'PERCENTAGE') {
    const discount = this.price * (this.promotion.discountValue / 100);
    return Math.round((this.price - discount) * 100) / 100;
  }

  if (this.promotion.discountType === 'FIXED_PRICE') {
    return Math.max(0, this.price - this.promotion.discountValue);
  }

  return this.price;
});

// Middleware protector de desbordamiento de pila (DFS anti-ciclos)  
MenuSchema.pre('save', async function() {  
  if (!this.isModified('recipe') || this.recipe.length === 0) return;  
  const currentMenuId = this._id.toString();  
  const visited = new Set();

  async function checkCycles(menuId) {  
    if (menuId === currentMenuId) throw new Error('CIRCULAR_DEPENDENCY_DETECTED: Ciclo infinito en sub-recetas.');  
    if (visited.has(menuId)) return;  
    visited.add(menuId);  
    const parentMenu = await mongoose.model('Menu').findById(menuId).lean();  
    if (!parentMenu || !parentMenu.recipe) return;  
    for (const child of parentMenu.recipe) {  
      if (child.componentType === 'Menu') await checkCycles(child.componentId.toString());  
    }  
  }

  for (const component of this.recipe) {  
    if (component.componentType === 'Menu') await checkCycles(component.componentId.toString());  
  }  
});

export const Menu = mongoose.model('Menu', MenuSchema);
export default Menu;