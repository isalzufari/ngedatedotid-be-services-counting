class DataService {
  constructor(db) {
    this._db = db;
  }

  async storeData({ slug, result }) {
    const spots = await this._db.collection('spots').doc(slug);
    await spots.update(result);
  }
}

module.exports = DataService;
