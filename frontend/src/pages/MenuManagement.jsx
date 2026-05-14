import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const MenuManagement = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [catName, setCatName] = useState('');
  
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItemId, setEditItemId] = useState(null);
  const [itemForm, setItemForm] = useState({
    name: '', description: '', category: '', basePrice: '', imageUrl: '',
    sizes: [] // { size, price }
  });

  const fetchData = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/menu/items')
      ]);
      setCategories(catRes.data);
      setItems(itemRes.data);
      if (catRes.data.length > 0 && !itemForm.category) {
        setItemForm(prev => ({ ...prev, category: catRes.data[0]._id }));
      }
    } catch (err) {
      toast.error('Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catName) return;
    try {
      await api.post('/menu/categories', { name: catName });
      toast.success('Category added');
      setCatName('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/menu/categories/${id}`);
      toast.success('Category deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const resetItemForm = () => {
    setItemForm({ name: '', description: '', category: categories[0]?._id || '', basePrice: '', imageUrl: '', sizes: [] });
    setEditItemId(null);
    setShowItemForm(false);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...itemForm, basePrice: Number(itemForm.basePrice) };
      if (editItemId) {
        await api.put(`/menu/items/${editItemId}`, payload);
        toast.success('Item updated');
      } else {
        await api.post('/menu/items', payload);
        toast.success('Item added');
      }
      resetItemForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save item');
    }
  };

  const handleEditItem = (item) => {
    setItemForm({
      name: item.name,
      description: item.description || '',
      category: item.category._id,
      basePrice: item.basePrice,
      imageUrl: item.imageUrl || '',
      sizes: item.sizes.map(s => ({ size: s.size, price: s.price }))
    });
    setEditItemId(item._id);
    setShowItemForm(true);
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/menu/items/${id}`);
      toast.success('Item deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const handleToggleAvailability = async (id) => {
    try {
      await api.patch(`/menu/items/${id}/toggle`);
      fetchData();
    } catch (err) {
      toast.error('Failed to toggle availability');
    }
  };

  const addSize = (size) => {
    if (itemForm.sizes.find(s => s.size === size)) return;
    setItemForm(prev => ({ ...prev, sizes: [...prev.sizes, { size, price: '' }] }));
  };

  const removeSize = (size) => {
    setItemForm(prev => ({ ...prev, sizes: prev.sizes.filter(s => s.size !== size) }));
  };

  const updateSizePrice = (size, price) => {
    setItemForm(prev => ({
      ...prev,
      sizes: prev.sizes.map(s => s.size === size ? { ...s, price: Number(price) } : s)
    }));
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-6 md:gap-8">
      
      {/* Categories Column */}
      <div className="w-full md:w-1/3 space-y-6">
        <div className="card">
          <h2 className="section-title mb-4">Categories</h2>
          <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
            <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="New category name" className="input-field py-1" />
            <button type="submit" className="btn-gold py-1">Add</button>
          </form>
          
          <ul className="space-y-2">
            {categories.map(cat => (
              <li key={cat._id} className="flex justify-between items-center bg-brown-900 px-4 py-2 rounded-lg border border-brown-700">
                <span className="font-semibold text-cream-200">{cat.name}</span>
                <button onClick={() => handleDeleteCategory(cat._id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Items Column */}
      <div className="w-full md:w-2/3 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="page-title">Menu Items</h1>
          <button onClick={() => { resetItemForm(); setShowItemForm(true); }} className="btn-gold w-full sm:w-auto">Add New Item</button>
        </div>

        {showItemForm && (
          <div className="card border-gold-500 mb-6">
            <h3 className="text-xl font-bold text-cream-100 mb-4">{editItemId ? 'Edit Item' : 'New Item'}</h3>
            <form onSubmit={handleSaveItem} className="space-y-4 text-sm md:text-base">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name</label>
                  <input value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} className="input-field" required>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="label">Description</label>
                <input value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} className="input-field" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Base Price (₹)</label>
                  <input type="number" value={itemForm.basePrice} onChange={e => setItemForm({...itemForm, basePrice: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="label">Image URL (optional)</label>
                  <input value={itemForm.imageUrl} onChange={e => setItemForm({...itemForm, imageUrl: e.target.value})} className="input-field" />
                </div>
              </div>

              <div>
                <label className="label">Sizes & Variations</label>
                <div className="flex gap-2 mb-2">
                  {['S', 'M', 'L'].map(sz => (
                    <button key={sz} type="button" onClick={() => addSize(sz)} className="btn-outline py-1 px-3 text-xs">+ {sz} Size</button>
                  ))}
                </div>
                {itemForm.sizes.length > 0 && (
                  <div className="space-y-2">
                    {itemForm.sizes.map(s => (
                      <div key={s.size} className="flex items-center gap-4 bg-brown-900 p-2 rounded border border-brown-700">
                        <span className="font-bold w-8">{s.size}</span>
                        <input type="number" placeholder="Price" value={s.price} onChange={e => updateSizePrice(s.size, e.target.value)} className="input-field py-1 w-32" required />
                        <button type="button" onClick={() => removeSize(s.size)} className="text-red-400 text-sm">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-brown-700">
                <button type="button" onClick={resetItemForm} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-gold">Save Item</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brown-700 text-brown-400 text-sm">
                  <th className="pb-3 px-4 font-medium">Name</th>
                  <th className="pb-3 px-4 font-medium">Category</th>
                  <th className="pb-3 px-4 font-medium">Price</th>
                  <th className="pb-3 px-4 font-medium text-center">Available</th>
                  <th className="pb-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-800">
                {items.map(item => (
                  <tr key={item._id} className="hover:bg-brown-800/50">
                    <td className="py-3 px-4 font-semibold text-cream-200">
                      {item.name}
                      {item.sizes.length > 0 && <span className="block text-xs text-brown-400">Sizes: {item.sizes.map(s => s.size).join(', ')}</span>}
                    </td>
                    <td className="py-3 px-4 text-brown-300">{item.category?.name}</td>
                    <td className="py-3 px-4 text-gold-400">₹{item.basePrice}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleToggleAvailability(item._id)} className={`px-3 py-1 rounded-full text-xs font-bold ${item.isAvailable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {item.isAvailable ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-3">
                      <button onClick={() => handleEditItem(item)} className="text-blue-400 hover:text-blue-300 text-sm">Edit</button>
                      <button onClick={() => handleDeleteItem(item._id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;
