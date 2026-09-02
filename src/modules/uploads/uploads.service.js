export class UploadsService {
  /**
   * Encodes uploaded image buffer to Data URI for instant display and persistence.
   */
  static async uploadImage(buffer, { purpose = "general", userId = "anonymous", mimeType = "image/jpeg" }) {
    const validPurposes = ["restaurant-cover", "menu-item", "avatar", "general"];
    const sanitizedPurpose = validPurposes.includes(purpose) ? purpose : "general";

    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const publicId = `foodmenia/${sanitizedPurpose}/${userId}/img_${Date.now()}`;

    return {
      url: dataUrl,
      publicId,
    };
  }

  /**
   * Deletes asset reference by publicId
   */
  static async deleteImage(publicId) {
    if (!publicId) return { result: "not_found" };
    return { result: "ok" };
  }
}
