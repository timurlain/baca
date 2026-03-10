using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Data;

public class BacaDbContext : DbContext
{
    public BacaDbContext(DbContextOptions<BacaDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<GameRole> GameRoles => Set<GameRole>();
    public DbSet<LoginToken> LoginTokens => Set<LoginToken>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<AppSettings> AppSettings => Set<AppSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Global soft-delete query filters
        modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<TaskItem>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Category>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Tag>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<GameRole>().HasQueryFilter(e => !e.IsDeleted);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique().HasFilter("\"Email\" IS NOT NULL");
            entity.Property(u => u.Role).HasConversion<string>();

            entity.HasOne(u => u.GameRole)
                .WithMany(gr => gr.Users)
                .HasForeignKey(u => u.GameRoleId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // TaskItem
        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.HasIndex(t => t.Status);
            entity.HasIndex(t => t.AssigneeId);
            entity.HasIndex(t => t.ParentTaskId);
            entity.HasIndex(t => t.CategoryId);

            entity.Property(t => t.Status).HasConversion<string>();
            entity.Property(t => t.Priority).HasConversion<string>();

            entity.HasOne(t => t.Category)
                .WithMany(c => c.Tasks)
                .HasForeignKey(t => t.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(t => t.Assignee)
                .WithMany(u => u.AssignedTasks)
                .HasForeignKey(t => t.AssigneeId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(t => t.ParentTask)
                .WithMany(t => t.Subtasks)
                .HasForeignKey(t => t.ParentTaskId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(t => t.CreatedBy)
                .WithMany(u => u.CreatedTasks)
                .HasForeignKey(t => t.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Comment
        modelBuilder.Entity<Comment>(entity =>
        {
            entity.HasOne(c => c.Task)
                .WithMany(t => t.Comments)
                .HasForeignKey(c => c.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.Author)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // LoginToken
        modelBuilder.Entity<LoginToken>(entity =>
        {
            entity.HasIndex(lt => lt.Token).IsUnique();

            entity.HasOne(lt => lt.User)
                .WithMany(u => u.LoginTokens)
                .HasForeignKey(lt => lt.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Category
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasIndex(c => c.Name).IsUnique();
        });

        // GameRole
        modelBuilder.Entity<GameRole>(entity =>
        {
            entity.HasIndex(gr => gr.Name).IsUnique();
        });

        // Tag
        modelBuilder.Entity<Tag>(entity =>
        {
            entity.HasIndex(t => t.Name).IsUnique();

            entity.HasMany(t => t.Tasks)
                .WithMany(ti => ti.Tags)
                .UsingEntity("TaskTag");
        });

        // AppSettings — single row, seeded at runtime in Program.cs
    }
}
