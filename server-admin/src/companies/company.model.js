import mongoose from 'mongoose';

/**
 * Modelo de Empresa (Company)
 * Representa la entidad legal y comercial de un cliente del ERP en un entorno multi-tenant.
 */
const companySchema = new mongoose.Schema({
    // === Identidad Legal ===
    legalName:     { type: String, required: true, trim: true },              // Razón Social
    alias:         { type: String, required: true, trim: true, unique: true },// Nombre comercial
    taxId:         { type: String, required: true, trim: true, unique: true },// NIT / VAT / RFC
    sector:        { type: String, required: true, enum: ['Restaurante', 'Cafetería', 'Bar', 'Panadería', 'Food Truck', 'Catering', 'Otro'] },
    companySize:   { type: String, required: true, enum: ['1-10', '11-50', '51-200', '200+'] },
    // === Localización ===
    country:       { type: String, required: true, trim: true },
    timezone:      { type: String, required: true, default: 'America/Guatemala' },
    currency:      { type: String, required: true, default: 'GTQ', maxLength: 3 },
    // === Branding ===
    logo:          { type: String, default: 'companies/default_logo' },       // Cloudinary path
    subdomain:     { type: String, required: true, trim: true, unique: true, lowercase: true,
                     match: [/^[a-z0-9-]+$/, 'Subdominio solo permite letras minúsculas, números y guiones'] },
    // === Contacto ===
    email:         { type: String, trim: true },
    phoneNumber:   { type: String, trim: true },
    // === Propietario (COMPANY_ADMIN) ===
    owner:         { type: String, required: true },
    // === Estado ===
    isActive:      { type: Boolean, default: true }
}, { timestamps: true });

/**
 * Índice compuesto para garantizar que un usuario solo sea dueño de una empresa.
 */
companySchema.index({ owner: 1 }, { unique: true });

export default mongoose.model('Company', companySchema);
