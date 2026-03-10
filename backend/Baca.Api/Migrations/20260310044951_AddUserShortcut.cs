using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Baca.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserShortcut : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Shortcut",
                table: "Users",
                type: "character varying(2)",
                maxLength: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Shortcut",
                table: "Users");
        }
    }
}
