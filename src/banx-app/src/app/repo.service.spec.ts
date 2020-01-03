import { TestBed } from '@angular/core/testing';

import { dirname, basename } from '../../../lib/common';
import {
  RepoService,
  Repository,
  exists,
  mkdir,
  rmdir,
  touch,
  walk,
  isEmpty,
  rm,
  rmAll
} from './repo.service';
import { HttpClientModule } from '@angular/common/http';

fdescribe('RepoService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [
      HttpClientModule
    ]
  }));

  it('should be created', () => {
    const service: RepoService = TestBed.get(RepoService);
    expect(service).toBeTruthy();
  });

  it('should be able to create directories', async () => {
    const path = '/testpath';
    await mkdir(path);
    try {
      expect(await exists(path)).toBe(true);
    }
    finally {
      await rmdir(path);
    }
    expect(await exists(path)).toBe(false);
  });

  it('should be able to create files', async () => {
    const path = '/testfile';
    await touch(path);
    try {
      expect(await exists(path)).toBe(true);
    }
    finally {
      await rm(path);
    }
    expect(await exists(path)).toBe(false);
  });

  it('should be able to test if a directory is empty', async () => {
    const path = '/testdir/testfile';
    const dirpath = dirname(path);
    await mkdir(dirpath);
    try {
      expect(await exists(dirpath)).toBe(true);
      expect(await isEmpty(dirpath)).toBe(true);
      await touch(path);
      try {
        expect(await isEmpty(dirpath)).toBe(false);
      }
      finally {
        await rm(path);
      }
    }
    finally {
      await rmdir(dirpath);
    }
    expect(await exists(dirpath)).toBe(false);
  });
});
