import { UsersRepository } from "./users.repository.js";
import { db } from "../../database/connection.js";
import { HTTP_STATUS } from "../../config/constants.js";

export class UsersService {
  static async getProfile(userId) {
    const user = await UsersRepository.findById(userId);
    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    return user;
  }

  static async updateProfile(userId, { name, email, phone, avatar_url }) {
    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name;
    if (phone !== undefined) updatePayload.phone = phone;
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url;

    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase();
      const existingUser = await UsersRepository.findByEmail(normalizedEmail);
      if (existingUser && existingUser.id !== userId) {
        const error = new Error("This email is already in use by another account.");
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }
      updatePayload.email = normalizedEmail;
    }

    if (Object.keys(updatePayload).length === 0) {
      return this.getProfile(userId);
    }

    const updatedUser = await UsersRepository.updateProfile(userId, updatePayload);
    return updatedUser;
  }

  // Addresses
  static async getAddresses(userId) {
    return UsersRepository.getAddressesByUserId(userId);
  }

  static async addAddress(userId, addressData) {
    return db.transaction(async (trx) => {
      const isFirst = (await trx("addresses").where({ user_id: userId }).count("id as count"))[0].count === 0;
      const isDefault = Boolean(addressData.is_default || isFirst);

      if (isDefault) {
        await UsersRepository.clearDefaultAddresses(userId, trx);
      }

      const newAddress = await UsersRepository.createAddress(
        {
          user_id: userId,
          label: addressData.label || "Home",
          full_address: addressData.full_address || addressData.fullAddress || addressData.street || addressData.address || "Delivery Location",
          lat: addressData.lat || null,
          lng: addressData.lng || null,
          city: addressData.city || null,
          country: addressData.country || null,
          is_default: isDefault,
        },
        trx
      );

      return newAddress;
    });
  }

  static async updateAddress(addressId, userId, updateData) {
    const existing = await UsersRepository.getAddressById(addressId, userId);
    if (!existing) {
      const error = new Error("Address not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    return db.transaction(async (trx) => {
      if (updateData.is_default) {
        await UsersRepository.clearDefaultAddresses(userId, trx);
      }

      const updated = await UsersRepository.updateAddress(addressId, userId, updateData, trx);
      return updated;
    });
  }

  static async deleteAddress(addressId, userId) {
    const existing = await UsersRepository.getAddressById(addressId, userId);
    if (!existing) {
      const error = new Error("Address not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    await UsersRepository.deleteAddress(addressId, userId);
    return { message: "Address deleted successfully." };
  }

  static async setDefaultAddress(addressId, userId) {
    const existing = await UsersRepository.getAddressById(addressId, userId);
    if (!existing) {
      const error = new Error("Address not found.");
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }

    return db.transaction(async (trx) => {
      await UsersRepository.clearDefaultAddresses(userId, trx);
      const updated = await UsersRepository.updateAddress(
        addressId,
        userId,
        { is_default: true },
        trx
      );
      return updated;
    });
  }
}
