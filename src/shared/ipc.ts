import type { AccountDto, AccountInput } from './accounts'
import type { ErrorCode } from './errors'
import type { FamilyMemberDto, MemberInput } from './family-members'
import type { TagDto } from './tags'
import type {
  CategoryDto,
  CategoryKind,
  ProductDto,
  TransactionDto,
  TransactionInput
} from './transactions'

/** Every IPC channel with its input and output. The preload, handlers and renderer are typed from this. */
interface IpcContract {
  'accounts:list': { input: { includeArchived: boolean }; output: AccountDto[] }
  'accounts:create': { input: AccountInput; output: AccountDto }
  'accounts:update': { input: { id: number; input: AccountInput }; output: AccountDto }
  'accounts:setArchived': { input: { id: number; archived: boolean }; output: AccountDto }
  'accounts:delete': { input: { id: number }; output: null }
  'members:list': { input: null; output: FamilyMemberDto[] }
  'members:create': { input: MemberInput; output: FamilyMemberDto }
  'members:rename': { input: { id: number; input: MemberInput }; output: FamilyMemberDto }
  'members:delete': { input: { id: number }; output: null }
  'tags:list': { input: null; output: TagDto[] }
  'categories:list': { input: { kind: CategoryKind }; output: CategoryDto[] }
  'products:list': { input: null; output: ProductDto[] }
  'transactions:list': { input: null; output: TransactionDto[] }
  'transactions:create': { input: TransactionInput; output: TransactionDto }
  'transactions:update': { input: { id: number; input: TransactionInput }; output: TransactionDto }
  'transactions:delete': { input: { id: number }; output: null }
}

export type IpcChannel = keyof IpcContract
export type IpcInput<C extends IpcChannel> = IpcContract[C]['input']
export type IpcOutput<C extends IpcChannel> = IpcContract[C]['output']

// A Record forces every channel of the contract to be listed here.
const channelSet: Record<IpcChannel, true> = {
  'accounts:list': true,
  'accounts:create': true,
  'accounts:update': true,
  'accounts:setArchived': true,
  'accounts:delete': true,
  'members:list': true,
  'members:create': true,
  'members:rename': true,
  'members:delete': true,
  'tags:list': true,
  'categories:list': true,
  'products:list': true,
  'transactions:list': true,
  'transactions:create': true,
  'transactions:update': true,
  'transactions:delete': true
}

/** Allowlist enforced by the preload. */
export const ipcChannels = Object.keys(channelSet) as IpcChannel[]

export type Result<T> = { ok: true; data: T } | { ok: false; code: ErrorCode; message: string }

export interface Api {
  invoke<C extends IpcChannel>(channel: C, input: IpcInput<C>): Promise<Result<IpcOutput<C>>>
}
