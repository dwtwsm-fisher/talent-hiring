
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

interface DictItem {
  id: string;
  dictType: string;
  name: string;
  sortOrder: number;
}

type DictType = 'company' | 'location' | 'education_level' | 'work_year' | 'salary_range' | 'resume_tag';

const DICT_TYPE_CONFIG: { id: DictType; label: string }[] = [
  { id: 'company', label: '公司' },
  { id: 'location', label: '工作地点' },
  { id: 'education_level', label: '学历要求' },
  { id: 'work_year', label: '工作年限' },
  { id: 'salary_range', label: '薪资范围' },
  { id: 'resume_tag', label: '简历标签' },
];

const DictionarySettings: React.FC = () => {
  const [activeType, setActiveType] = useState<DictType>('company');
  const [items, setItems] = useState<DictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const loadItems = () => {
    setLoading(true);
    api.dict.list(activeType).then(setItems).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => loadItems(), [activeType]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await api.dict.create({ dictType: activeType, name: newName.trim() });
      setNewName('');
      loadItems();
    } catch (err) {
      console.error(err);
      alert('添加失败，可能已存在同名项');
    }
    setAdding(false);
  };

  const handleEdit = (item: DictItem) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await api.dict.update(editingId, { name: editName.trim() });
      setEditingId(null);
      setEditName('');
      loadItems();
    } catch (err) {
      console.error(err);
      alert('修改失败，可能已存在同名项');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此项？')) return;
    try {
      await api.dict.delete(id);
      loadItems();
    } catch (err) {
      console.error(err);
      alert('删除失败');
    }
  };

  const typeLabel = DICT_TYPE_CONFIG.find(c => c.id === activeType)?.label ?? activeType;

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchKeyword.trim().toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
        <h3 className="text-lg font-black text-slate-900 tracking-tight">数据字典维护</h3>
        <div className="flex flex-wrap gap-2">
          {DICT_TYPE_CONFIG.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setActiveType(id); setNewName(''); setSearchKeyword(''); setEditingId(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeType === id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 border-b border-slate-100 space-y-4">
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            placeholder={`新增${typeLabel}名称`}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button type="submit" disabled={adding || !newName.trim()} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all">
            {adding ? '添加中...' : '添加'}
          </button>
        </form>
        <div>
          <input
            type="text"
            placeholder={`搜索${typeLabel}名称...`}
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <p className="p-6 text-slate-400 text-sm">加载中...</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {filteredItems.map(item => (
              <li key={item.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors gap-4">
                {editingId === item.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/30"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                    />
                    <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">
                      保存
                    </button>
                    <button onClick={handleCancelEdit} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-slate-900 flex-1">{item.name}</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 text-xs font-bold hover:underline"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-500 text-xs font-bold hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
            {filteredItems.length === 0 && !loading && (
              <li className="px-6 py-12 text-slate-400 text-sm text-center">
                {searchKeyword ? '未找到匹配项' : '暂无数据，请添加'}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: '超级管理员' | '招聘负责人' | '面试官' | '业务主管';
  status: '启用' | '禁用';
  description: string;
  lastLogin: string;
}

export const Settings: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'dictionary' | 'permissions' | 'notifications'>('accounts');
  const [accounts, setAccounts] = useState<UserAccount[]>([
    { id: 'U001', username: 'admin_hr', name: '李专家', role: '招聘负责人', status: '启用', description: '负责总部核心管理岗招聘', lastLogin: '2024-05-20 10:30' },
    { id: 'U002', username: 'tech_lead_01', name: '工程部张工', role: '面试官', status: '启用', description: '负责电梯、水暖技术岗初试', lastLogin: '2024-05-19 14:20' },
    { id: 'U003', username: 'serv_mgr', name: '客服部王总', role: '面试官', status: '启用', description: '负责客服及前台礼仪终面', lastLogin: '2024-05-18 09:15' },
    { id: 'U004', username: 'archived_hr', name: '陈专员', role: '招聘负责人', status: '禁用', description: '前项目招聘专员', lastLogin: '2023-12-01 17:00' },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    username: '',
    name: '',
    password: '',
    role: '面试官' as UserAccount['role'],
    description: ''
  });

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const account: UserAccount = {
      id: `U00${accounts.length + 1}`,
      username: newAccount.username,
      name: newAccount.name,
      role: newAccount.role,
      status: '启用',
      description: newAccount.description,
      lastLogin: '-'
    };
    setAccounts([account, ...accounts]);
    setShowAddModal(false);
    setNewAccount({ username: '', name: '', password: '', role: '面试官', description: '' });
  };

  const toggleStatus = (id: string) => {
    setAccounts(accounts.map(acc => 
      acc.id === id ? { ...acc, status: acc.status === '启用' ? '禁用' : '启用' } : acc
    ));
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">系统设置</h2>
          <p className="text-sm text-slate-500 font-medium">管理企业账号、权限分配及全局系统配置</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Sub Navigation Sidebar */}
        <div className="w-56 flex flex-col gap-2">
          {[
            { id: 'accounts', label: '账号管理', icon: '👤' },
            { id: 'dictionary', label: '数据字典', icon: '📋' },
            { id: 'permissions', label: '权限配置', icon: '🔐' },
            { id: 'notifications', label: '消息通知', icon: '🔔' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeSubTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-white/50'}`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
          {activeSubTab === 'dictionary' ? (
            <DictionarySettings />
          ) : activeSubTab === 'accounts' ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">企业员工账号库</h3>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  开通面试官账号
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">账号/ID</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">姓名/角色</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">职能描述</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">最后登录</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">状态</th>
                      <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {accounts.map(acc => (
                      <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-900">{acc.username}</p>
                          <p className="text-[10px] text-slate-400 font-medium">UID: {acc.id}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-900">{acc.name}</p>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${acc.role === '超级管理员' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {acc.role}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs text-slate-500 font-medium italic max-w-xs truncate">{acc.description}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-[10px] text-slate-400 font-bold">{acc.lastLogin}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${acc.status === '启用' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                            {acc.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => toggleStatus(acc.id)}
                              className={`text-[10px] font-black uppercase tracking-widest hover:underline ${acc.status === '启用' ? 'text-red-500' : 'text-green-600'}`}
                            >
                              {acc.status === '启用' ? '禁用' : '启用'}
                            </button>
                            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">编辑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <p className="text-lg font-black uppercase tracking-widest text-slate-200">{activeSubTab.toUpperCase()} 模块迭代中</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">核心账号管理功能已上线，更多设置项敬请期待</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Account Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-xl font-black text-slate-900 tracking-tight">开通面试官账号</h4>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddAccount} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">用户账号 (ID)</label>
                  <input 
                    required
                    type="text" 
                    placeholder="如: tech_zhang" 
                    className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={newAccount.username}
                    onChange={e => setNewAccount({...newAccount, username: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">初始密码</label>
                  <input 
                    required
                    type="password" 
                    placeholder="********" 
                    className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={newAccount.password}
                    onChange={e => setNewAccount({...newAccount, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">姓名</label>
                  <input 
                    required
                    type="text" 
                    placeholder="如: 张工" 
                    className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={newAccount.name}
                    onChange={e => setNewAccount({...newAccount, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">权限角色</label>
                  <select 
                    className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={newAccount.role}
                    onChange={e => setNewAccount({...newAccount, role: e.target.value as any})}
                  >
                    <option>面试官</option>
                    <option>招聘负责人</option>
                    <option>业务主管</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">账号职能描述</label>
                <textarea 
                  rows={3} 
                  placeholder="该账号主要负责哪些岗位的面试工作？" 
                  className="w-full bg-slate-50 border-slate-100 rounded-xl py-3 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={newAccount.description}
                  onChange={e => setNewAccount({...newAccount, description: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all">确认开通账号</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="px-10 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">取消</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
