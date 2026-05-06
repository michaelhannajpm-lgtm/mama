import { C } from '../theme';

export const Dot = ({ on }) => (
  <div className="transition-all" style={{
    width: on ? 22 : 6, height: 6, borderRadius: 4,
    background: on ? C.terracotta : C.divider,
  }}/>
);
