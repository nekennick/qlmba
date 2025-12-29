"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Plus,
    Pencil,
    Trash2,
    Users,
    Building2,
    ArrowLeft,
    Shield,
    User,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import {
    getTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
} from "@/app/actions/admin"

type Team = {
    id: string
    name: string
    code: string
    _count: { users: number; dispatches: number }
}

type UserType = {
    id: string
    username: string
    name: string
    role: string
    teamId: string | null
    team: { id: string; name: string; code: string } | null
}

export default function AdminPage() {
    const [teams, setTeams] = useState<Team[]>([])
    const [users, setUsers] = useState<UserType[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Team form state
    const [teamDialogOpen, setTeamDialogOpen] = useState(false)
    const [editingTeam, setEditingTeam] = useState<Team | null>(null)
    const [teamForm, setTeamForm] = useState({ name: "", code: "" })

    // User form state
    const [userDialogOpen, setUserDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<UserType | null>(null)
    const [userForm, setUserForm] = useState({
        username: "",
        password: "",
        name: "",
        role: "USER",
        teamId: "",
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setIsLoading(true)
        try {
            const [teamsData, usersData] = await Promise.all([getTeams(), getUsers()])
            setTeams(teamsData)
            setUsers(usersData)
        } catch {
            toast.error("Không thể tải dữ liệu")
        } finally {
            setIsLoading(false)
        }
    }

    // ============ TEAM HANDLERS ============

    function openTeamDialog(team?: Team) {
        if (team) {
            setEditingTeam(team)
            setTeamForm({ name: team.name, code: team.code })
        } else {
            setEditingTeam(null)
            setTeamForm({ name: "", code: "" })
        }
        setTeamDialogOpen(true)
    }

    async function handleTeamSubmit() {
        try {
            if (editingTeam) {
                await updateTeam(editingTeam.id, teamForm)
                toast.success("Đã cập nhật đội")
            } else {
                await createTeam(teamForm)
                toast.success("Đã tạo đội mới")
            }
            setTeamDialogOpen(false)
            loadData()
        } catch {
            toast.error("Có lỗi xảy ra")
        }
    }

    async function handleDeleteTeam(team: Team) {
        if (team._count.users > 0 || team._count.dispatches > 0) {
            toast.error("Không thể xóa đội có users hoặc dispatches")
            return
        }
        if (!confirm(`Xóa đội "${team.name}"?`)) return
        try {
            await deleteTeam(team.id)
            toast.success("Đã xóa đội")
            loadData()
        } catch {
            toast.error("Có lỗi xảy ra")
        }
    }

    // ============ USER HANDLERS ============

    function openUserDialog(user?: UserType) {
        if (user) {
            setEditingUser(user)
            setUserForm({
                username: user.username,
                password: "",
                name: user.name,
                role: user.role,
                teamId: user.teamId || "",
            })
        } else {
            setEditingUser(null)
            setUserForm({
                username: "",
                password: "",
                name: "",
                role: "USER",
                teamId: "",
            })
        }
        setUserDialogOpen(true)
    }

    async function handleUserSubmit() {
        try {
            if (editingUser) {
                await updateUser(editingUser.id, {
                    ...userForm,
                    teamId: userForm.teamId || null,
                    password: userForm.password || undefined,
                })
                toast.success("Đã cập nhật user")
            } else {
                if (!userForm.password) {
                    toast.error("Vui lòng nhập mật khẩu")
                    return
                }
                await createUser({
                    ...userForm,
                    teamId: userForm.teamId || null,
                })
                toast.success("Đã tạo user mới")
            }
            setUserDialogOpen(false)
            loadData()
        } catch {
            toast.error("Có lỗi xảy ra")
        }
    }

    async function handleDeleteUser(user: UserType) {
        if (!confirm(`Xóa user "${user.username}"?`)) return
        try {
            await deleteUser(user.id)
            toast.success("Đã xóa user")
            loadData()
        } catch {
            toast.error("Có lỗi xảy ra")
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Quản trị hệ thống</h1>
                        <p className="text-muted-foreground">
                            Quản lý đội và tài khoản người dùng
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="teams" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="teams" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Quản lý Đội ({teams.length})
                    </TabsTrigger>
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="h-4 w-4" />
                        Quản lý Users ({users.length})
                    </TabsTrigger>
                </TabsList>

                {/* Teams Tab */}
                <TabsContent value="teams">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Danh sách Đội</CardTitle>
                                <CardDescription>
                                    Quản lý các đội trong hệ thống
                                </CardDescription>
                            </div>
                            <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => openTeamDialog()}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Thêm đội
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            {editingTeam ? "Sửa đội" : "Thêm đội mới"}
                                        </DialogTitle>
                                        <DialogDescription>
                                            Nhập thông tin đội
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Tên đội</Label>
                                            <Input
                                                value={teamForm.name}
                                                onChange={(e) =>
                                                    setTeamForm({ ...teamForm, name: e.target.value })
                                                }
                                                placeholder="VD: Đội QLVH Lưới điện 1"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Mã đội</Label>
                                            <Input
                                                value={teamForm.code}
                                                onChange={(e) =>
                                                    setTeamForm({
                                                        ...teamForm,
                                                        code: e.target.value.toUpperCase(),
                                                    })
                                                }
                                                placeholder="VD: DOI1"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setTeamDialogOpen(false)}
                                        >
                                            Hủy
                                        </Button>
                                        <Button onClick={handleTeamSubmit}>
                                            {editingTeam ? "Cập nhật" : "Tạo"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Mã đội</TableHead>
                                        <TableHead>Tên đội</TableHead>
                                        <TableHead className="text-center">Users</TableHead>
                                        <TableHead className="text-center">Dispatches</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {teams.map((team) => (
                                        <TableRow key={team.id}>
                                            <TableCell className="font-mono font-medium">
                                                {team.code}
                                            </TableCell>
                                            <TableCell>{team.name}</TableCell>
                                            <TableCell className="text-center">
                                                {team._count.users}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {team._count.dispatches}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openTeamDialog(team)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteTeam(team)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {teams.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">
                                                Chưa có đội nào
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Danh sách Users</CardTitle>
                                <CardDescription>
                                    Quản lý tài khoản người dùng
                                </CardDescription>
                            </div>
                            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => openUserDialog()}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Thêm user
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            {editingUser ? "Sửa user" : "Thêm user mới"}
                                        </DialogTitle>
                                        <DialogDescription>
                                            Nhập thông tin tài khoản
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Tên đăng nhập</Label>
                                            <Input
                                                value={userForm.username}
                                                onChange={(e) =>
                                                    setUserForm({ ...userForm, username: e.target.value })
                                                }
                                                placeholder="username"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>
                                                Mật khẩu{" "}
                                                {editingUser && "(để trống nếu không đổi)"}
                                            </Label>
                                            <Input
                                                type="password"
                                                value={userForm.password}
                                                onChange={(e) =>
                                                    setUserForm({ ...userForm, password: e.target.value })
                                                }
                                                placeholder={editingUser ? "••••••••" : "Nhập mật khẩu"}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Tên hiển thị</Label>
                                            <Input
                                                value={userForm.name}
                                                onChange={(e) =>
                                                    setUserForm({ ...userForm, name: e.target.value })
                                                }
                                                placeholder="Nguyễn Văn A"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Vai trò</Label>
                                            <Select
                                                value={userForm.role}
                                                onValueChange={(value) =>
                                                    setUserForm({ ...userForm, role: value })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ADMIN">
                                                        <div className="flex items-center gap-2">
                                                            <Shield className="h-4 w-4" />
                                                            Admin
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="USER">
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4" />
                                                            User
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Đội</Label>
                                            <Select
                                                value={userForm.teamId}
                                                onValueChange={(value) =>
                                                    setUserForm({
                                                        ...userForm,
                                                        teamId: value === "none" ? "" : value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn đội" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">-- Không thuộc đội --</SelectItem>
                                                    {teams.map((team) => (
                                                        <SelectItem key={team.id} value={team.id}>
                                                            {team.code} - {team.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setUserDialogOpen(false)}
                                        >
                                            Hủy
                                        </Button>
                                        <Button onClick={handleUserSubmit}>
                                            {editingUser ? "Cập nhật" : "Tạo"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Tên</TableHead>
                                        <TableHead>Vai trò</TableHead>
                                        <TableHead>Đội</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-mono font-medium">
                                                {user.username}
                                            </TableCell>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell>
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${user.role === "ADMIN"
                                                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                                            : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                                        }`}
                                                >
                                                    {user.role === "ADMIN" ? (
                                                        <Shield className="h-3 w-3" />
                                                    ) : (
                                                        <User className="h-3 w-3" />
                                                    )}
                                                    {user.role}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {user.team ? (
                                                    <span className="font-mono text-sm">
                                                        {user.team.code}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openUserDialog(user)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteUser(user)}
                                                    disabled={user.username === "admin"}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {users.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">
                                                Chưa có user nào
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
